import { z } from "zod";
import { waErrorCategory } from "../errors.js";

// Every object schema is loose: unknown fields from Meta are tolerated.

/**
 * Webhook error object (F-092), with `category` added from `code` (F-072).
 * `message` is the same as `title`.
 */
export const WebhookErrorSchema = z
  .looseObject({
    code: z.number().int(),
    title: z.string(),
    message: z.string().optional(),
    error_data: z.looseObject({ details: z.string().optional() }).optional(),
    href: z.string().optional(),
  })
  .transform((error) => ({ ...error, category: waErrorCategory(error.code) }));
export type WaWebhookError = z.output<typeof WebhookErrorSchema>;

/** Fields common to every inbound message (F-087, F-089). */
const MessageCommonShape = {
  from: z.string(),
  id: z.string(),
  timestamp: z.string(), // Unix seconds, as a string (F-087)
  context: z.looseObject({ from: z.string().optional(), id: z.string().optional() }).optional(),
};

/** Common fields plus the raw `type`, used to route a message. */
export const MessageHeadSchema = z.looseObject({ ...MessageCommonShape, type: z.string() });

/** Text (F-087). */
const TextMessageSchema = z.looseObject({
  ...MessageCommonShape,
  type: z.literal("text"),
  text: z.looseObject({ body: z.string() }),
});

/** Document (F-088). `url` is rolling out since Nov 12, 2025. */
const DocumentMessageSchema = z.looseObject({
  ...MessageCommonShape,
  type: z.literal("document"),
  document: z.looseObject({
    id: z.string(),
    mime_type: z.string(),
    sha256: z.string(),
    filename: z.string().optional(),
    caption: z.string().optional(),
    url: z.string().optional(),
  }),
});

/** Image (F-088). */
const ImageMessageSchema = z.looseObject({
  ...MessageCommonShape,
  type: z.literal("image"),
  image: z.looseObject({
    id: z.string(),
    mime_type: z.string(),
    sha256: z.string(),
    caption: z.string().optional(),
    url: z.string().optional(),
  }),
});

/** Quick-reply button tap on a template (F-089). */
const ButtonMessageSchema = z.looseObject({
  ...MessageCommonShape,
  type: z.literal("button"),
  button: z.looseObject({ payload: z.string(), text: z.string() }),
});

/** Unsupported message with errors, e.g. `131051` or `131060` (F-090). */
const UnsupportedMessageSchema = z.looseObject({
  ...MessageCommonShape,
  type: z.literal("unsupported"),
  unsupported: z.looseObject({ type: z.string() }).optional(),
  errors: z.array(WebhookErrorSchema),
});

/** Message types mapped by v0.1. */
export const KNOWN_MESSAGE_TYPES = ["text", "document", "image", "button", "unsupported"] as const;

export const KnownMessageSchema = z.discriminatedUnion("type", [
  TextMessageSchema,
  DocumentMessageSchema,
  ImageMessageSchema,
  ButtonMessageSchema,
  UnsupportedMessageSchema,
]);

/** Any other message type, kept raw for forward compatibility [lib]. */
export const OtherMessageSchema = MessageHeadSchema.transform((message) => {
  const raw: Record<string, unknown> = message;
  return {
    from: message.from,
    id: message.id,
    timestamp: message.timestamp,
    ...(message.context === undefined ? {} : { context: message.context }),
    type: "other" as const,
    originalType: message.type,
    raw,
  };
});

export type WaInboundMessage =
  z.output<typeof KnownMessageSchema> | z.output<typeof OtherMessageSchema>;

/** Status values listed on the status page (F-091), including `played` (C-3). */
export const KNOWN_MESSAGE_STATUSES = ["sent", "delivered", "read", "failed", "played"] as const; // F-091, C-3
export type WaKnownMessageStatus = (typeof KNOWN_MESSAGE_STATUSES)[number];

function isKnownStatus(value: string): value is WaKnownMessageStatus {
  return (KNOWN_MESSAGE_STATUSES as readonly string[]).includes(value);
}

/**
 * Outbound message status (F-091). `pricing` and `conversation` are optional
 * and loose; `conversation` is absent on v24.0+ in most cases. An unrecognised
 * status is passed through with `known: false` (D-1).
 */
export const MessageStatusSchema = z
  .looseObject({
    id: z.string(),
    status: z.string(),
    timestamp: z.string(),
    recipient_id: z.string(),
    pricing: z
      .looseObject({
        billable: z.boolean().optional(),
        pricing_model: z.string().optional(),
        category: z.string().optional(),
        type: z.string().optional(),
      })
      .optional(),
    conversation: z
      .looseObject({
        id: z.string(),
        expiration_timestamp: z.string().optional(),
        origin: z.looseObject({ type: z.string() }).optional(),
      })
      .optional(),
    errors: z.array(WebhookErrorSchema).optional(),
  })
  .transform((value) => {
    const { status } = value;
    return isKnownStatus(status)
      ? { ...value, known: true as const, status }
      : { ...value, known: false as const, status };
  });
export type WaMessageStatus = z.output<typeof MessageStatusSchema>;

/** Sender profile (F-085). */
export const ContactSchema = z.looseObject({
  profile: z.looseObject({ name: z.string() }),
  wa_id: z.string().optional(),
});

/** `value` of a `messages` change (F-085, F-086). */
export const MessagesValueSchema = z.looseObject({
  metadata: z.looseObject({ display_phone_number: z.string(), phone_number_id: z.string() }),
  contacts: z.array(ContactSchema).optional(),
  messages: z.array(MessageHeadSchema).optional(),
  statuses: z.array(MessageStatusSchema).optional(),
  errors: z.array(WebhookErrorSchema).optional(),
});

/** `event` values of `message_template_status_update` (F-117). */
export const TEMPLATE_STATUS_EVENTS = [
  "APPROVED",
  "ARCHIVED",
  "UNARCHIVED",
  "DELETED",
  "DISABLED",
  "FLAGGED",
  "IN_APPEAL",
  "LIMIT_EXCEEDED",
  "LOCKED",
  "PAUSED",
  "PENDING",
  "REINSTATED",
  "PENDING_DELETION",
  "REJECTED",
] as const; // F-117

/**
 * `value` of a `message_template_status_update` change (F-117, F-118).
 * `message_template_id` is an integer on the wire (G-15). `disable_date` is an
 * integer in the field table but a quoted string in the page's example (C-12),
 * so both are accepted.
 */
export const TemplateStatusValueSchema = z.looseObject({
  event: z.string(),
  message_template_id: z.union([z.number(), z.string()]),
  message_template_name: z.string(),
  message_template_language: z.string(),
  reason: z.string().nullable().optional(),
  message_template_category: z.string().optional(),
  disable_info: z
    .looseObject({ disable_date: z.union([z.number(), z.string()]).optional() })
    .optional(),
  other_info: z.looseObject({ title: z.string(), description: z.string().optional() }).optional(),
  rejection_info: z
    .looseObject({ reason: z.string(), recommendation: z.string().optional() })
    .optional(),
});

/** Webhook envelope (F-085). `object` is always `whatsapp_business_account`. */
export const WebhookEnvelopeSchema = z.looseObject({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(
    z.looseObject({
      id: z.string(), // WABA ID
      time: z.number().optional(), // F-117, G-15
      changes: z.array(z.looseObject({ field: z.string(), value: z.unknown() })),
    }),
  ),
});
