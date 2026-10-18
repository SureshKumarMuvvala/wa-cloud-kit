import { z } from "zod";
import { WaValidationError } from "../errors.js";

/** `event` values on a successful flow (F-200). Unknown strings are allowed. */
export const EMBEDDED_SIGNUP_FINISH_EVENTS = [
  "FINISH",
  "FINISH_ONLY_WABA",
  "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
  "FINISH_OBO_MIGRATION",
  "FINISH_GRANT_ONLY_API_ACCESS",
] as const; // F-200

/** `data.current_step` values of an abandoned flow (F-201). */
export const EMBEDDED_SIGNUP_CANCEL_STEPS = [
  "BUSINESS_ACCOUNT_SELECTION",
  "WABA_PHONE_PROFILE_PICKER",
  "WHATSAPP_BUSINESS_PROFILE_SETUP",
  "PHONE_NUMBER_SETUP",
  "PHONE_NUMBER_VERIFICATION",
  "PERMISSIONS",
] as const; // F-201

const DigitsSchema = z.string().regex(/^\d+$/); // [lib] ids end up in URL paths

/** The browser-sent session event (F-200, F-201). Loose: extra fields such as `version` are kept. */
const SessionEventSchema = z.looseObject({
  type: z.literal("WA_EMBEDDED_SIGNUP"), // F-200
  event: z.string().min(1),
  data: z.looseObject({}).optional(),
});

const FinishDataSchema = z.looseObject({
  waba_id: DigitsSchema,
  phone_number_id: DigitsSchema.optional(), // absent for FINISH_ONLY_WABA (F-200)
  business_id: DigitsSchema.optional(),
  waba_ids: z.array(DigitsSchema).optional(), // multi-WABA flows (F-200)
});

const CancelDataSchema = z.looseObject({ current_step: z.string().min(1) }); // F-201

const ErrorReportDataSchema = z.looseObject({
  error_message: z.string(),
  error_code: z.union([z.string(), z.number()]),
  session_id: z.string(),
  timestamp: z.union([z.string(), z.number()]),
}); // F-201

export type WaEmbeddedSignupEvent =
  | {
      kind: "finish";
      /** `FINISH`, `FINISH_ONLY_WABA`, … (F-200); not narrowed. */
      event: string;
      wabaId: string;
      /** Absent for `FINISH_ONLY_WABA` (F-200). */
      phoneNumberId?: string;
      businessId?: string;
      wabaIds?: string[];
      raw: Record<string, unknown>;
    }
  | { kind: "cancel"; currentStep: string; raw: Record<string, unknown> }
  | {
      kind: "error_report";
      errorMessage: string;
      errorCode: string;
      sessionId: string;
      timestamp: string;
      raw: Record<string, unknown>;
    }
  | { kind: "flow_error"; raw: Record<string, unknown> };

function parseOrThrow<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw WaValidationError.fromZod("Invalid Embedded Signup event", result.error);
  }
  return result.data;
}

/**
 * Parses the session event the browser posted to the server (v0.3 §3.1, D-39).
 * The event came through the tenant user's browser, so it is untrusted:
 * confirm its ids with the tenant's business token before storing them
 * (`listPhoneNumbers`, D-36). The code is not part of this event.
 *
 * Throws {@link WaValidationError} when `type` is not `WA_EMBEDDED_SIGNUP`, an
 * id is not a digit string, or the data does not fit the event.
 */
export function parseEmbeddedSignupEvent(input: unknown): WaEmbeddedSignupEvent {
  const parsed = parseOrThrow(SessionEventSchema, input);
  const raw: Record<string, unknown> = parsed;
  const data: unknown = parsed.data ?? {};

  if (parsed.event === "CANCEL") {
    if (data !== null && typeof data === "object" && "error_message" in data) {
      const report = parseOrThrow(ErrorReportDataSchema, data);
      return {
        kind: "error_report",
        errorMessage: report.error_message,
        errorCode: String(report.error_code),
        sessionId: report.session_id,
        timestamp: String(report.timestamp),
        raw,
      };
    }
    const cancel = parseOrThrow(CancelDataSchema, data);
    return { kind: "cancel", currentStep: cancel.current_step, raw };
  }
  if (parsed.event === "ERROR") {
    return { kind: "flow_error", raw }; // F-200
  }
  const finish = parseOrThrow(FinishDataSchema, data);
  return {
    kind: "finish",
    event: parsed.event,
    wabaId: finish.waba_id,
    ...(finish.phone_number_id === undefined ? {} : { phoneNumberId: finish.phone_number_id }),
    ...(finish.business_id === undefined ? {} : { businessId: finish.business_id }),
    ...(finish.waba_ids === undefined ? {} : { wabaIds: finish.waba_ids }),
    raw,
  };
}
