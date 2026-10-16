import { z } from "zod";
import {
  CommonSendFields,
  MediaRefSchema,
  PayloadEnvelopeShape,
  envelope,
  parseInput,
} from "./common.js";

/** Positional text parameter, `{{1}}`, `{{2}}`, … (F-043). */
export const TextParamSchema = z.strictObject({
  type: z.literal("text"),
  text: z.string().min(1),
});
export type TextParam = z.output<typeof TextParamSchema>;

/**
 * Named text parameter (F-042): the name is lowercase letters and underscores.
 * Named parameters may be sent in any order.
 */
export const NamedTextParamSchema = z.strictObject({
  type: z.literal("text"),
  parameter_name: z.string().regex(/^[a-z_]+$/), // F-042
  text: z.string().min(1),
});
export type NamedTextParam = z.output<typeof NamedTextParamSchema>;

/** Currency parameter (F-048). `amount_1000` is the amount × 1000. */
export const CurrencyParamSchema = z.strictObject({
  type: z.literal("currency"),
  currency: z.strictObject({
    fallback_value: z.string().min(1),
    code: z.string().min(1),
    amount_1000: z.number().int(),
  }),
});
export type CurrencyParam = z.output<typeof CurrencyParamSchema>;

/** Date-time parameter (F-048). */
export const DateTimeParamSchema = z.strictObject({
  type: z.literal("date_time"),
  date_time: z.strictObject({ fallback_value: z.string().min(1) }),
});
export type DateTimeParam = z.output<typeof DateTimeParamSchema>;

const PositionalParamSchema = z.discriminatedUnion("type", [
  TextParamSchema,
  CurrencyParamSchema,
  DateTimeParamSchema,
]);
export type PositionalParam = z.output<typeof PositionalParamSchema>;

/**
 * Template body. `format` makes mixing named and positional parameters
 * unrepresentable (F-041). Named names must be unique (F-042); positional
 * values are sent in array order, which the caller owns (F-043).
 */
export const TemplateBodySchema = z.discriminatedUnion("format", [
  z.strictObject({
    format: z.literal("named"),
    parameters: z
      .array(NamedTextParamSchema)
      .min(1)
      .superRefine((params, ctx) => {
        const seen = new Set<string>();
        params.forEach((param, index) => {
          if (seen.has(param.parameter_name)) {
            ctx.addIssue({
              code: "custom",
              message: `Duplicate named parameter "${param.parameter_name}"`,
              path: [index, "parameter_name"],
            });
          }
          seen.add(param.parameter_name);
        });
      }),
  }),
  z.strictObject({
    format: z.literal("positional"),
    parameters: z.array(PositionalParamSchema).min(1),
  }),
]);
export type TemplateBody = z.input<typeof TemplateBodySchema>;

/**
 * Template message input (F-040–F-048). Templates are the only messages that
 * can be sent outside the customer service window (F-031) and must be
 * `APPROVED` (F-040).
 *
 * Not validated client-side (the API decides): template existence and approval
 * (F-040, `132001`), parameter count (`132000`), per-parameter length (G-3) and
 * category (F-050).
 */
export const SendTemplateInputSchema = z.strictObject({
  ...CommonSendFields,
  name: z.string().min(1),
  /** Emitted as `template.language.code`. */
  languageCode: z.string().min(1),
  /** DOCUMENT header (F-045, F-046, F-047). No `filename` in v0.1 (G-1, D-4). */
  header: z.strictObject({ document: MediaRefSchema }).optional(),
  body: TemplateBodySchema.optional(),
});
export type SendTemplateInput = z.input<typeof SendTemplateInputSchema>;

const HeaderComponentSchema = z.strictObject({
  type: z.literal("header"),
  parameters: z.array(z.strictObject({ type: z.literal("document"), document: MediaRefSchema })), // F-046
});
const BodyComponentSchema = z.strictObject({
  type: z.literal("body"),
  parameters: z.array(z.union([NamedTextParamSchema, PositionalParamSchema])),
});

/** The exact JSON body of a template message (F-010, F-046). */
export const TemplateMessagePayloadSchema = z.strictObject({
  ...PayloadEnvelopeShape,
  type: z.literal("template"),
  template: z.strictObject({
    name: z.string(),
    language: z.strictObject({ code: z.string() }),
    components: z.array(z.union([HeaderComponentSchema, BodyComponentSchema])).optional(),
  }),
});
export type TemplateMessagePayload = z.output<typeof TemplateMessagePayloadSchema>;
type TemplateComponent = NonNullable<TemplateMessagePayload["template"]["components"]>[number];

/**
 * Builds the template payload. Pure; throws `WaValidationError` on invalid
 * input. A component is emitted only when it has parameters; with neither
 * header nor body, `components` is omitted [lib].
 */
export function buildTemplateMessage(input: SendTemplateInput): TemplateMessagePayload {
  const parsed = parseInput(SendTemplateInputSchema, input, "Invalid template message");
  const components: TemplateComponent[] = [];
  if (parsed.header !== undefined) {
    components.push({
      type: "header",
      parameters: [{ type: "document", document: parsed.header.document }],
    });
  }
  if (parsed.body !== undefined) {
    components.push({ type: "body", parameters: parsed.body.parameters });
  }
  return {
    ...envelope(parsed),
    type: "template",
    template: {
      name: parsed.name,
      language: { code: parsed.languageCode },
      ...(components.length === 0 ? {} : { components }),
    },
  };
}
