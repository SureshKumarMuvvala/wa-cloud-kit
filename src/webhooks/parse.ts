import type { z } from "zod";
import { WaValidationError } from "../errors.js";
import {
  ContactSchema,
  KNOWN_MESSAGE_TYPES,
  KnownMessageSchema,
  MessagesValueSchema,
  OtherMessageSchema,
  TEMPLATE_STATUS_EVENTS,
  TemplateStatusValueSchema,
  WebhookEnvelopeSchema,
  type WaInboundMessage,
  type WaMessageStatus,
  type WaWebhookError,
} from "./schemas.js";

interface WebhookEventBase {
  /** `entry[].id`, the WhatsApp Business Account ID (F-085). */
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
}

export interface WaWebhookContact {
  name: string;
  waId?: string;
}

/**
 * A `message_template_status_update` event (F-117, F-118, F-161). The payload
 * has no `metadata`, so this has no `phoneNumberId`: the tenant is identified
 * by `wabaId` only. Template webhooks always go to the app's default callback
 * (F-161).
 */
export interface WaTemplateStatusEvent {
  kind: "template_status";
  /** `entry[].id` (F-117). */
  wabaId: string;
  /** `entry[].time` (F-117, G-15). */
  eventTime?: number;
  /** An integer on the wire; a string here (G-15). */
  templateId: string;
  templateName: string;
  templateLanguage: string;
  /** Not narrowed (D-9); `knownEvent` says whether it is in {@link TEMPLATE_STATUS_EVENTS}. */
  event: string;
  knownEvent: boolean;
  /** `null` when the template is scheduled for deletion (F-117). */
  reason: string | null;
  /** `MARKETING`, `UTILITY` or `AUTHENTICATION` (F-117). */
  category?: string;
  /** `disable_info.disable_date` (F-118, C-12). */
  disableDate?: number;
  /** Pause and unpause details (F-118). */
  other?: { title: string; description?: string };
  /** Only for `INVALID_FORMAT` rejections (F-118, G-12). */
  rejection?: { reason: string; recommendation?: string };
}

export type WaWebhookEvent =
  | WaTemplateStatusEvent
  | (WebhookEventBase & { kind: "message"; contact?: WaWebhookContact; message: WaInboundMessage })
  | (WebhookEventBase & { kind: "status"; status: WaMessageStatus })
  | (WebhookEventBase & { kind: "error"; error: WaWebhookError });

export interface ParsedWebhook {
  events: WaWebhookEvent[];
  /** Changes whose `field` is neither `messages` nor `message_template_status_update`. */
  skippedChanges: number;
}

function parseOrThrow<S extends z.ZodType>(
  schema: S,
  value: unknown,
  context: string,
): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw WaValidationError.fromZod(context, result.error);
  }
  return result.data;
}

function isKnownTemplateEvent(event: string): boolean {
  return (TEMPLATE_STATUS_EVENTS as readonly string[]).includes(event);
}

function toTemplateStatusEvent(
  wabaId: string,
  eventTime: number | undefined,
  value: z.output<typeof TemplateStatusValueSchema>,
): WaTemplateStatusEvent {
  const rawDate = value.disable_info?.disable_date;
  const disableDate =
    typeof rawDate === "string" ? (/^\d+$/.test(rawDate) ? Number(rawDate) : undefined) : rawDate;
  const { other_info: other, rejection_info: rejection } = value;
  return {
    kind: "template_status",
    wabaId,
    ...(eventTime === undefined ? {} : { eventTime }),
    templateId: String(value.message_template_id),
    templateName: value.message_template_name,
    templateLanguage: value.message_template_language,
    event: value.event,
    knownEvent: isKnownTemplateEvent(value.event),
    reason: value.reason ?? null,
    ...(value.message_template_category === undefined
      ? {}
      : { category: value.message_template_category }),
    ...(disableDate === undefined ? {} : { disableDate }),
    ...(other === undefined
      ? {}
      : {
          other: {
            title: other.title,
            ...(other.description === undefined ? {} : { description: other.description }),
          },
        }),
    ...(rejection === undefined
      ? {}
      : {
          rejection: {
            reason: rejection.reason,
            ...(rejection.recommendation === undefined
              ? {}
              : { recommendation: rejection.recommendation }),
          },
        }),
  };
}

function isKnownType(type: string): boolean {
  return (KNOWN_MESSAGE_TYPES as readonly string[]).includes(type);
}

function toContact(
  contacts: readonly z.output<typeof ContactSchema>[] | undefined,
  from: string,
): WaWebhookContact | undefined {
  // Prefer the profile whose wa_id matches the sender; else the first [lib].
  const contact = contacts?.find((c) => c.wa_id === from) ?? contacts?.[0];
  if (contact === undefined) {
    return undefined;
  }
  return {
    name: contact.profile.name,
    ...(contact.wa_id === undefined ? {} : { waId: contact.wa_id }),
  };
}

/**
 * Parses a webhook POST body (already JSON-parsed) into flat events.
 *
 * - `object` must be `whatsapp_business_account` (F-085), else
 *   `WaValidationError`.
 * - `field === "messages"` and `field === "message_template_status_update"`
 *   changes are mapped (v0.2); others increment `skippedChanges` [lib].
 * - Order is entry → change → messages, then statuses, then errors.
 * - Unknown message types become `{type: "other"}` [lib]; unknown statuses
 *   become `known: false` (D-1).
 *
 * Callers should respond 200 quickly (F-083), dedupe on `message.id` or
 * `status.id + status` (F-083, F-084), and expect payloads up to 3 MB (F-084).
 * Webhook media IDs expire after 7 days (F-062).
 */
export function parseWebhookPayload(body: unknown): ParsedWebhook {
  const payload = parseOrThrow(WebhookEnvelopeSchema, body, "Invalid webhook payload");
  const events: WaWebhookEvent[] = [];
  let skippedChanges = 0;

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field === "message_template_status_update") {
        const value = parseOrThrow(
          TemplateStatusValueSchema,
          change.value,
          "Invalid template status webhook value",
        );
        events.push(toTemplateStatusEvent(entry.id, entry.time, value));
        continue;
      }
      if (change.field !== "messages") {
        skippedChanges += 1;
        continue;
      }
      const value = parseOrThrow(
        MessagesValueSchema,
        change.value,
        "Invalid messages webhook value",
      );
      const base: WebhookEventBase = {
        wabaId: entry.id,
        phoneNumberId: value.metadata.phone_number_id,
        displayPhoneNumber: value.metadata.display_phone_number,
      };

      for (const head of value.messages ?? []) {
        const message: WaInboundMessage = isKnownType(head.type)
          ? parseOrThrow(KnownMessageSchema, head, "Invalid webhook message")
          : parseOrThrow(OtherMessageSchema, head, "Invalid webhook message");
        const contact = toContact(value.contacts, head.from);
        events.push({
          ...base,
          kind: "message",
          ...(contact === undefined ? {} : { contact }),
          message,
        });
      }
      for (const status of value.statuses ?? []) {
        events.push({ ...base, kind: "status", status });
      }
      for (const error of value.errors ?? []) {
        events.push({ ...base, kind: "error", error });
      }
    }
  }
  return { events, skippedChanges };
}
