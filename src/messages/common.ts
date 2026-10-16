import { z } from "zod";
import { WaValidationError } from "../errors.js";

/**
 * Recipient, passed through unchanged (F-013). If the leading `+` is omitted,
 * Meta prepends the business number's country calling code; send `+` and the
 * country code.
 */
export const RecipientSchema = z.string().min(1);

/**
 * A media object: exactly one of `id` or `link` (F-016, F-047). A `link` must be
 * an absolute http(s) URL on a publicly accessible server (F-022, G-6); Meta
 * caches it for 10 minutes (F-015).
 */
export const MediaRefSchema = z.union([
  z.strictObject({ id: z.string().min(1) }),
  z.strictObject({ link: z.url({ protocol: /^https?$/ }) }),
]);
export type MediaRef = z.input<typeof MediaRefSchema>;

/** Fields common to every send input (F-010). */
export const CommonSendFields = {
  to: RecipientSchema,
  /** Makes the message a reply; emitted as `context.message_id` (F-010). */
  replyToMessageId: z.string().min(1).optional(),
};

/** Envelope fields common to every send payload (F-010). */
export const PayloadEnvelopeShape = {
  messaging_product: z.literal("whatsapp"),
  recipient_type: z.literal("individual"),
  to: z.string(),
  context: z.strictObject({ message_id: z.string() }).optional(),
};

export const PayloadEnvelopeSchema = z.strictObject(PayloadEnvelopeShape);
type PayloadEnvelope = z.output<typeof PayloadEnvelopeSchema>;

/** Builds the common envelope for a payload (F-010). Groups are out of scope. */
export function envelope(input: {
  to: string;
  replyToMessageId?: string | undefined;
}): PayloadEnvelope {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: input.to,
    ...(input.replyToMessageId === undefined
      ? {}
      : { context: { message_id: input.replyToMessageId } }),
  };
}

/** Parses caller input with a strict schema; throws {@link WaValidationError}. */
export function parseInput<S extends z.ZodType>(
  schema: S,
  input: unknown,
  context: string,
): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw WaValidationError.fromZod(context, result.error);
  }
  return result.data;
}

/**
 * Send-message response (F-011). Loose, so fields Meta adds later do not break
 * callers [lib].
 */
export const SendMessageResponseSchema = z.looseObject({
  messaging_product: z.literal("whatsapp"),
  contacts: z.array(z.looseObject({ input: z.string(), wa_id: z.string() })),
  messages: z
    .array(
      z.looseObject({
        id: z.string(),
        message_status: z.enum(["accepted", "held_for_quality_assessment", "paused"]).optional(), // F-011
      }),
    )
    .min(1),
});
export type SendMessageResponse = z.output<typeof SendMessageResponseSchema>;
export type MessageStatusOnSend = NonNullable<
  SendMessageResponse["messages"][number]["message_status"]
>;

/**
 * Result of a send. Success means the request was *accepted*, not delivered
 * (F-012); delivery is reported via the `messages` webhook, and delivery order
 * is not guaranteed (F-014).
 */
export interface SendMessageResult {
  messageId: string;
  waId?: string;
  /** Only present for paced templates (F-011). */
  messageStatus?: MessageStatusOnSend;
  raw: SendMessageResponse;
}

/** Maps a parsed response to a {@link SendMessageResult}. */
export function toSendMessageResult(raw: SendMessageResponse): SendMessageResult {
  const [first] = raw.messages;
  if (first === undefined) {
    // Unreachable: the schema requires at least one message.
    throw new Error("Send response has no messages");
  }
  const waId = raw.contacts[0]?.wa_id;
  return {
    messageId: first.id,
    ...(waId === undefined ? {} : { waId }),
    ...(first.message_status === undefined ? {} : { messageStatus: first.message_status }),
    raw,
  };
}
