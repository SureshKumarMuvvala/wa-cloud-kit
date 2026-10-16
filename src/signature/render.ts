import { z } from "zod";
import { WaValidationError } from "../errors.js";
import { parseInput } from "../messages/common.js";
import {
  NamedTextParamSchema,
  TextParamSchema,
  type NamedTextParam,
  type TextParam,
} from "../messages/template.js";

/** Default separator between signature parts (G-2, D-5) [lib]. */
export const DEFAULT_SIGNATURE_SEPARATOR = " | ";

/** A tenant's sign-off, rendered into one template body variable. */
export const TenantSignatureSchema = z.strictObject({
  /** e.g. "Accounts Team" */
  name: z.string(),
  /** e.g. "Billing" */
  title: z.string().optional(),
  /** e.g. "Example Traders" */
  company: z.string().optional(),
  /** Extra lines, e.g. a support email. */
  lines: z.array(z.string()).optional(),
});
export type TenantSignature = z.input<typeof TenantSignatureSchema>;

export const RenderSignatureInputSchema = z.strictObject({
  signature: TenantSignatureSchema,
  /** If set, a named parameter is produced (F-042); otherwise a positional one. */
  parameterName: NamedTextParamSchema.shape.parameter_name.optional(),
  /** Must not contain `\n` or `\t` (G-2, D-5). */
  separator: z
    .string()
    .refine((value) => !/[\n\t]/.test(value), {
      message: "separator must not contain a newline or tab (G-2)",
    })
    .default(DEFAULT_SIGNATURE_SEPARATOR),
});
export type RenderSignatureInput = z.input<typeof RenderSignatureInputSchema>;

/**
 * Renders a tenant signature into a template text parameter.
 *
 * Parts are taken in order `name`, `title`, `company`, `...lines`; every run of
 * whitespace (including `\n`, `\r`, `\t`) collapses to one space, each part is
 * trimmed, empty parts are dropped, and the rest are joined with `separator`
 * [lib]. The output never contains `\n` or `\t` (G-2, D-5).
 *
 * Throws `WaValidationError` if nothing is left: an empty variable value would
 * leave a dangling or empty parameter (F-049). `#`, `$` and `%` are NOT
 * stripped: F-049 lists them as template-review rejection reasons for the
 * template definition, not for send-time values.
 *
 * The parameter fills a placeholder in a template you registered earlier. That
 * body must not start or end with a parameter (F-049, error `2388299`), so end
 * it in static text:
 *
 * Template body: `Hello {{customer_name}}, invoice {{invoice_number}} is attached. For any questions contact {{signature}}. Thank you.`
 */
export function renderSignatureParameter(
  input: RenderSignatureInput & { parameterName: string },
): NamedTextParam;
export function renderSignatureParameter(
  input: RenderSignatureInput & { parameterName?: undefined },
): TextParam;
export function renderSignatureParameter(input: RenderSignatureInput): TextParam | NamedTextParam;
export function renderSignatureParameter(input: RenderSignatureInput): TextParam | NamedTextParam {
  const parsed = parseInput(RenderSignatureInputSchema, input, "Invalid signature");
  const { signature } = parsed;
  const parts = [signature.name, signature.title, signature.company, ...(signature.lines ?? [])]
    .filter((part) => part !== undefined)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part.length > 0);
  const text = parts.join(parsed.separator);
  if (text.length === 0) {
    throw new WaValidationError("Signature renders to an empty value (F-049)", [
      {
        code: "custom",
        message: "Signature renders to an empty value (F-049)",
        path: ["signature"],
        input: "",
      },
    ]);
  }
  return parsed.parameterName === undefined
    ? { type: "text", text }
    : { type: "text", parameter_name: parsed.parameterName, text };
}

/** Maximum template body length (F-044). */
export const TEMPLATE_BODY_MAX_CHARS = 1024; // F-044

const PLACEHOLDER = /\{\{([a-z_]+|[1-9]\d*)\}\}/g; // named (F-042) or positional (F-043)

/**
 * Substitutes `{{name}}` (named parameters, F-042) or `{{n}}` (positional,
 * F-043) in the approved template body with the parameter values and throws
 * `WaValidationError` if the result exceeds 1024 characters (F-044). This is a
 * length check only; it does not enforce F-049 (that is `createTemplate`'s job).
 * Placeholders without a value are left as they are [lib]. Length counts
 * UTF-16 code units [lib]. Optional: the library does not hold templates.
 */
export function assertTemplateBodyLength(
  templateBodyText: string,
  parameters: readonly (TextParam | NamedTextParam)[],
): void {
  const parsedParams = parseInput(
    z.array(z.union([NamedTextParamSchema, TextParamSchema])),
    parameters,
    "Invalid template parameters",
  );
  const named = new Map<string, string>();
  for (const param of parsedParams) {
    if ("parameter_name" in param) {
      named.set(param.parameter_name, param.text);
    }
  }
  const rendered = templateBodyText.replace(PLACEHOLDER, (placeholder, key: string) => {
    if (/^\d+$/.test(key)) {
      return parsedParams[Number(key) - 1]?.text ?? placeholder;
    }
    return named.get(key) ?? placeholder;
  });
  if (rendered.length > TEMPLATE_BODY_MAX_CHARS) {
    const message = `Rendered template body is ${String(rendered.length)} characters; the maximum is ${String(TEMPLATE_BODY_MAX_CHARS)} (F-044)`;
    throw new WaValidationError(message, [
      { code: "custom", message, path: ["templateBodyText"], input: rendered.length },
    ]);
  }
}
