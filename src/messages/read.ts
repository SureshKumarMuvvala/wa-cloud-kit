import { z } from "zod";
import { parseInput } from "./common.js";

/**
 * Mark-as-read input (F-234, F-235). `messageId` is an inbound message `id`
 * from a webhook. Mark within 30 days of receipt; earlier messages in the
 * conversation are marked too; an invalid id returns `131009` (F-234). With
 * `typingIndicator: true` a typing indicator is shown: dismissed on reply or
 * after 25 seconds; show it only when a reply will follow (F-235). Whether
 * this needs an open customer service window is not stated (G-25).
 */
export const MarkAsReadInputSchema = z.strictObject({
  messageId: z.string().min(1),
  typingIndicator: z.boolean().optional(),
});
export type MarkAsReadInput = z.input<typeof MarkAsReadInputSchema>;

/** The exact JSON body (F-234, F-235). No `to`, `recipient_type` or `context`. */
export const MarkAsReadPayloadSchema = z.strictObject({
  messaging_product: z.literal("whatsapp"),
  status: z.literal("read"),
  message_id: z.string(),
  typing_indicator: z.strictObject({ type: z.literal("text") }).optional(),
});
export type MarkAsReadPayload = z.output<typeof MarkAsReadPayloadSchema>;

/** `{success: true}` (F-234). `success` is required [lib]. */
export const MarkAsReadResponseSchema = z.looseObject({ success: z.boolean() });
export type MarkAsReadResponse = z.output<typeof MarkAsReadResponseSchema>;

export interface MarkAsReadResult {
  success: boolean;
  raw: MarkAsReadResponse;
}

/** Builds the mark-as-read payload. Pure; throws `WaValidationError` on invalid input. */
export function buildMarkAsReadPayload(input: MarkAsReadInput): MarkAsReadPayload {
  const parsed = parseInput(MarkAsReadInputSchema, input, "Invalid mark-as-read request");
  return {
    messaging_product: "whatsapp",
    status: "read",
    message_id: parsed.messageId,
    ...(parsed.typingIndicator === true ? { typing_indicator: { type: "text" as const } } : {}),
  };
}
