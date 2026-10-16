import { z } from "zod";
import {
  CommonSendFields,
  MediaRefSchema,
  PayloadEnvelopeShape,
  envelope,
  parseInput,
} from "./common.js";

/**
 * Document message input (F-021, F-016). Only deliverable inside the customer
 * service window (F-030, F-031). Meta recommends `id` over `link` (F-021).
 */
export const SendDocumentInputSchema = z.strictObject({
  ...CommonSendFields,
  document: MediaRefSchema,
  caption: z.string().min(1).max(1024).optional(), // F-021
  filename: z.string().min(1).optional(), // F-021 ("with extension")
});
export type SendDocumentInput = z.input<typeof SendDocumentInputSchema>;

/** The exact JSON body of a document message (F-010, F-021). */
export const DocumentMessagePayloadSchema = z.strictObject({
  ...PayloadEnvelopeShape,
  type: z.literal("document"),
  document: z.strictObject({
    id: z.string().optional(),
    link: z.string().optional(),
    caption: z.string().optional(),
    filename: z.string().optional(),
  }),
});
export type DocumentMessagePayload = z.output<typeof DocumentMessagePayloadSchema>;

/** Builds the document payload. Pure; throws `WaValidationError` on invalid input. */
export function buildDocumentMessage(input: SendDocumentInput): DocumentMessagePayload {
  const parsed = parseInput(SendDocumentInputSchema, input, "Invalid document message");
  return {
    ...envelope(parsed),
    type: "document",
    document: {
      ...parsed.document,
      ...(parsed.caption === undefined ? {} : { caption: parsed.caption }),
      ...(parsed.filename === undefined ? {} : { filename: parsed.filename }),
    },
  };
}
