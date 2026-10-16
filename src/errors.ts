import { z } from "zod";

/**
 * The Graph API error envelope (F-070). Loose, so new fields from Meta do not
 * break parsing.
 */
export const GraphErrorEnvelopeSchema = z.object({
  error: z.looseObject({
    message: z.string(),
    type: z.string().optional(),
    code: z.number().int(),
    error_data: z
      .looseObject({
        messaging_product: z.string().optional(),
        details: z.string().optional(),
      })
      .optional(),
    error_subcode: z.number().int().optional(), // deprecated, not returned in v16.0+ (F-071)
    fbtrace_id: z.string().optional(),
  }),
});
export type GraphErrorEnvelope = z.infer<typeof GraphErrorEnvelopeSchema>;

/** Error categories, derived from the Graph `code` only (F-071, G-5). */
export type WaErrorCategory =
  | "auth"
  | "integrity"
  | "throttling"
  | "service_window_closed"
  | "template"
  | "recipient"
  | "media"
  | "parameter"
  | "server"
  | "unknown";

const CODE_CATEGORIES: ReadonlyMap<number, WaErrorCategory> = new Map<number, WaErrorCategory>([
  // auth: F-073 (0, 3, 10, 190, 200–299 handled below), 131005 from F-076
  [0, "auth"],
  [3, "auth"],
  [10, "auth"],
  [190, "auth"],
  [131005, "auth"],
  // integrity: F-074
  [368, "integrity"],
  [130497, "integrity"],
  [131031, "integrity"],
  // throttling: F-075
  [4, "throttling"],
  [80007, "throttling"],
  [130429, "throttling"],
  [131048, "throttling"],
  [131056, "throttling"],
  [131064, "throttling"],
  [133016, "throttling"],
  // customer service window closed: F-033
  [131047, "service_window_closed"],
  // template: F-051
  [132000, "template"],
  [132001, "template"],
  [132005, "template"],
  [132007, "template"],
  [132012, "template"],
  [132015, "template"],
  [132016, "template"],
  // recipient: F-076
  [130403, "recipient"],
  [131021, "recipient"],
  [131026, "recipient"],
  [131049, "recipient"],
  [131050, "recipient"],
  // media: F-064, F-076
  [131052, "media"],
  [131053, "media"],
  // parameter: F-076
  [100, "parameter"],
  [131008, "parameter"],
  [131009, "parameter"],
  [131051, "parameter"],
  // server: F-076
  [1, "server"],
  [2, "server"],
  [131000, "server"],
  [131016, "server"],
  [131057, "server"],
]);

/**
 * Categorizes a Graph API / webhook error `code` (F-071, F-072). Never uses
 * HTTP status or subcode. Unlisted codes are `"unknown"` [lib].
 */
export function waErrorCategory(code: number): WaErrorCategory {
  if (code >= 200 && code <= 299) {
    return "auth"; // F-073: 200–299
  }
  return CODE_CATEGORIES.get(code) ?? "unknown";
}

/** Base class for every error thrown by wa-cloud-kit. */
export class WaError extends Error {
  override readonly name: string = "WaError";
}

/** Caller input or config failed validation. No request was sent. */
export class WaValidationError extends WaError {
  override readonly name = "WaValidationError" as const;
  readonly issues: z.core.$ZodIssue[];

  constructor(message: string, issues: z.core.$ZodIssue[]) {
    super(message);
    this.issues = issues;
  }

  /** Builds the error from a ZodError; the message never includes input values. */
  static fromZod(context: string, error: z.ZodError): WaValidationError {
    return new WaValidationError(`${context}: ${z.prettifyError(error)}`, error.issues);
  }
}

/** `fetch` threw (network failure, abort, DNS). */
export class WaTransportError extends WaError {
  override readonly name = "WaTransportError" as const;
}

/** A non-2xx response whose body is the Graph error envelope (F-070). */
export class WaApiError extends WaError {
  override readonly name = "WaApiError" as const;
  readonly httpStatus: number;
  readonly code: number;
  readonly type: string | undefined;
  readonly details: string | undefined;
  readonly fbtraceId: string | undefined;
  readonly errorSubcode: number | undefined;
  readonly category: WaErrorCategory;
  readonly raw: GraphErrorEnvelope;

  constructor(input: { httpStatus: number; envelope: GraphErrorEnvelope }) {
    const { error } = input.envelope;
    super(error.message);
    this.httpStatus = input.httpStatus;
    this.code = error.code;
    this.type = error.type;
    this.details = error.error_data?.details;
    this.fbtraceId = error.fbtrace_id;
    this.errorSubcode = error.error_subcode;
    this.category = waErrorCategory(error.code);
    this.raw = input.envelope;
  }
}

/** Maximum length of {@link WaHttpError.bodyText} [lib]. */
export const HTTP_ERROR_BODY_MAX_CHARS = 2048;

/** A non-2xx response whose body is not the Graph error envelope. */
export class WaHttpError extends WaError {
  override readonly name = "WaHttpError" as const;
  readonly httpStatus: number;
  /** The response body, truncated to 2 KB [lib]. */
  readonly bodyText: string;

  constructor(input: { httpStatus: number; bodyText: string }) {
    super(`WhatsApp Cloud API responded with HTTP ${String(input.httpStatus)}`);
    this.httpStatus = input.httpStatus;
    this.bodyText = input.bodyText.slice(0, HTTP_ERROR_BODY_MAX_CHARS);
  }
}

/** A 2xx response that does not match the expected response schema. */
export class WaResponseShapeError extends WaError {
  override readonly name = "WaResponseShapeError" as const;
  readonly issues: z.core.$ZodIssue[];
  readonly raw: unknown;

  constructor(input: { issues: z.core.$ZodIssue[]; raw: unknown }) {
    super("WhatsApp Cloud API returned an unexpected response shape");
    this.issues = input.issues;
    this.raw = input.raw;
  }
}
