import { z } from "zod";

/** Template name (F-104): at most 512 characters, lowercase alphanumerics and underscores. */
export const TemplateNameSchema = z
  .string()
  .max(512)
  .regex(/^[a-z0-9_]+$/); // F-104

/** Maximum body length (F-044) and footer length (F-045). */
const BODY_MAX = 1024; // F-044
const FOOTER_MAX = 60; // F-045

const NamedExampleSchema = z.strictObject({
  name: z.string().regex(/^[a-z_]+$/), // F-042
  example: z.string().min(1),
});

/** Header: a DOCUMENT sample handle supplied by the caller (D-6, F-107, C-7, C-8, G-18). */
const HeaderSchema = z.strictObject({
  format: z.literal("DOCUMENT"),
  /** Opaque Resumable Upload handle; non-empty, no length limit (G-18). */
  headerHandle: z.string().min(1),
});

/**
 * Body. With parameters, `format` and one example per placeholder are
 * required (F-108); a body with no parameters is `{ text }` alone [lib].
 */
const BodySchema = z.union([
  z.strictObject({
    text: z.string().min(1).max(BODY_MAX),
    format: z.literal("named"), // F-108
    examples: z.array(NamedExampleSchema).min(1),
  }),
  z.strictObject({
    text: z.string().min(1).max(BODY_MAX),
    format: z.literal("positional"), // F-108
    examples: z.array(z.string().min(1)).min(1),
  }),
  z.strictObject({ text: z.string().min(1).max(BODY_MAX) }),
]);

const PLACEHOLDER = /\{\{([^{}]*)\}\}/g;

/**
 * Create-template input (F-100, F-102). v0.2 supports UTILITY templates only
 * [lib]. Everything here is checked before any request is sent.
 */
export const CreateTemplateInputSchema = z
  .strictObject({
    name: TemplateNameSchema,
    /** e.g. `"en_US"`; not enumerated (the language list page was not fetched). */
    language: z.string().min(1),
    category: z.literal("UTILITY"), // [lib]; the enum is F-103
    header: HeaderSchema.optional(),
    body: BodySchema,
    footer: z.strictObject({ text: z.string().min(1).max(FOOTER_MAX) }).optional(), // F-045; no variables in v0.2
    /** Seconds Meta keeps trying to deliver a message sent from this template (F-102). */
    messageSendTtlSeconds: z.int().positive().optional(),
  })
  .superRefine((input, ctx) => {
    const { body } = input;
    const text = body.text;
    const fail = (message: string, path: (string | number)[]): void => {
      ctx.addIssue({ code: "custom", message, path: ["body", ...path] });
    };

    const keys = [...text.matchAll(PLACEHOLDER)].map((match) => match[1] ?? "");
    const trimmed = text.trim();
    if (keys.length > 0 && (trimmed.startsWith("{{") || trimmed.endsWith("}}"))) {
      fail("body must not start or end with a parameter (F-049, 2388299)", ["text"]);
    }

    if (!("format" in body)) {
      if (keys.length > 0) {
        fail("body has parameters: set format and examples (F-108)", ["format"]);
      }
      return;
    }

    if (body.format === "named") {
      const seen = new Set<string>();
      for (const key of keys) {
        if (!/^[a-z_]+$/.test(key)) {
          fail(`named parameter "{{${key}}}" must match ^[a-z_]+$ (F-042)`, ["text"]);
        } else if (seen.has(key)) {
          fail(`named parameter "{{${key}}}" is used more than once (F-042)`, ["text"]);
        }
        seen.add(key);
      }
      const names = body.examples.map((example) => example.name);
      const missing = [...seen].filter((key) => !names.includes(key));
      const extra = names.filter((name) => !seen.has(name));
      if (new Set(names).size !== names.length || missing.length > 0 || extra.length > 0) {
        fail("examples must contain exactly one entry per named parameter (F-108)", ["examples"]);
      }
      return;
    }

    keys.forEach((key, index) => {
      if (key !== String(index + 1)) {
        fail(`positional parameters must be {{1}}…{{n}} in order with no gaps (F-043)`, ["text"]);
      }
    });
    if (body.examples.length !== keys.length) {
      fail("examples must contain exactly one entry per positional parameter (F-108)", [
        "examples",
      ]);
    }
  });
export type CreateTemplateInput = z.input<typeof CreateTemplateInputSchema>;

/** Create response (F-106). Loose. */
export const CreateTemplateResponseSchema = z.looseObject({
  id: z.string(),
  status: z.string(),
  category: z.string(),
});
export type CreateTemplateResponse = z.output<typeof CreateTemplateResponseSchema>;

/**
 * Result of `createTemplate`. A new template is `PENDING` (F-106) and cannot be
 * sent until `APPROVED` (F-040); review can take up to 24 hours (F-116).
 *
 * Check `category`: a utility template that contains marketing material is
 * re-categorized by Meta (F-050, F-109), so it may not be `"UTILITY"`. The
 * library does not throw [lib].
 */
export interface CreateTemplateResult {
  templateId: string;
  status: string;
  category: string;
  raw: CreateTemplateResponse;
}

/** Builds the wire body: uppercase enums per the reference (C-6, D-12). */
export function buildCreateTemplateBody(
  input: z.output<typeof CreateTemplateInputSchema>,
): unknown {
  const { body } = input;
  const bodyComponent: Record<string, unknown> = { type: "BODY", text: body.text };
  let parameterFormat: "NAMED" | "POSITIONAL" | undefined;
  if ("format" in body) {
    if (body.format === "named") {
      parameterFormat = "NAMED";
      bodyComponent.example = {
        body_text_named_params: body.examples.map((e) => ({
          param_name: e.name,
          example: e.example,
        })),
      }; // F-108
    } else {
      parameterFormat = "POSITIONAL";
      bodyComponent.example = { body_text: [body.examples] }; // F-108
    }
  }

  const components: unknown[] = [];
  if (input.header !== undefined) {
    components.push({
      type: "HEADER",
      format: input.header.format,
      example: { header_handle: [input.header.headerHandle] }, // F-107
    });
  }
  components.push(bodyComponent);
  if (input.footer !== undefined) {
    components.push({ type: "FOOTER", text: input.footer.text });
  }

  return {
    name: input.name,
    language: input.language,
    category: input.category,
    ...(parameterFormat === undefined ? {} : { parameter_format: parameterFormat }),
    components,
    ...(input.messageSendTtlSeconds === undefined
      ? {}
      : { message_send_ttl_seconds: input.messageSendTtlSeconds }), // F-102
  };
}
