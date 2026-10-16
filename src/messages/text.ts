import { z } from "zod";
import { CommonSendFields, PayloadEnvelopeShape, envelope, parseInput } from "./common.js";

/**
 * Text message input (F-020). Only deliverable inside the customer service
 * window (F-030, F-031); outside it, send a template.
 *
 * `body` length counts UTF-16 code units (JavaScript string length) [lib].
 */
export const SendTextInputSchema = z.strictObject({
  ...CommonSendFields,
  body: z.string().min(1).max(4096), // F-020
  previewUrl: z.boolean().optional(), // F-020
});
export type SendTextInput = z.input<typeof SendTextInputSchema>;

/** The exact JSON body of a text message (F-010, F-020). */
export const TextMessagePayloadSchema = z.strictObject({
  ...PayloadEnvelopeShape,
  type: z.literal("text"),
  text: z.strictObject({ body: z.string(), preview_url: z.boolean().optional() }),
});
export type TextMessagePayload = z.output<typeof TextMessagePayloadSchema>;

/** Builds the text payload. Pure; throws `WaValidationError` on invalid input. */
export function buildTextMessage(input: SendTextInput): TextMessagePayload {
  const parsed = parseInput(SendTextInputSchema, input, "Invalid text message");
  return {
    ...envelope(parsed),
    type: "text",
    text: {
      body: parsed.body,
      ...(parsed.previewUrl === undefined ? {} : { preview_url: parsed.previewUrl }),
    },
  };
}
