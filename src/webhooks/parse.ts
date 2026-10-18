import type { z } from "zod";
import { WaValidationError } from "../errors.js";
import {
  AccountUpdateValueSchema,
  ContactSchema,
  KNOWN_INTERACTIVE_REPLY_TYPES,
  KNOWN_MESSAGE_TYPES,
  KnownMessageSchema,
  MessageHeadSchema,
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

/**
 * An `account_update` event (F-174). Like template events it has no
 * `metadata`, so no `phoneNumberId`, and it always arrives at the app's
 * default callback URL (F-161).
 */
export interface WaAccountUpdateEvent {
  kind: "account_update";
  /** `entry[].id` exactly as received; on `PARTNER_*` events it is not the tenant WABA (C-13). */
  entryId: string;
  /** `value.waba_info.waba_id` if present, else `entry[].id` (D-32, C-13). */
  wabaId: string;
  /** `entry[].time`. */
  eventTime?: number;
  /** Not narrowed (D-9 spirit); see `PARTNER_ACCOUNT_EVENTS` (F-174). */
  event: string;
  /** `waba_info.owner_business_id` (F-174). */
  ownerBusinessId?: string;
  /** `waba_info.partner_app_id`, on `PARTNER_APP_*` events (F-174). */
  partnerAppId?: string;
  /** The whole `value`, for fields v0.3 does not model. */
  raw: Record<string, unknown>;
}

/**
 * A change whose `field` the parser does not model (D-33). It is listed, not
 * dropped, so the router can still route or report it.
 */
export interface WaUnhandledChange {
  field: string;
  /** `entry[].id`. */
  entryId: string;
  /** `entry[].time`. */
  eventTime?: number;
  /** `value.metadata.phone_number_id` when present. */
  phoneNumberId?: string;
  /** Untouched. */
  value: unknown;
}

export type WaWebhookEvent =
  | WaTemplateStatusEvent
  | WaAccountUpdateEvent
  | (WebhookEventBase & { kind: "message"; contact?: WaWebhookContact; message: WaInboundMessage })
  | (WebhookEventBase & { kind: "status"; status: WaMessageStatus })
  | (WebhookEventBase & { kind: "error"; error: WaWebhookError });

export interface ParsedWebhook {
  events: WaWebhookEvent[];
  /** Changes whose `field` the parser does not model, in payload order (D-33). */
  unhandled: WaUnhandledChange[];
  /** Always `unhandled.length`; kept for compatibility. */
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

function isKnownType(head: z.output<typeof MessageHeadSchema>): boolean {
  if (!(KNOWN_MESSAGE_TYPES as readonly string[]).includes(head.type)) {
    return false;
  }
  if (head.type !== "interactive") {
    return true;
  }
  // Only button_reply and list_reply are modelled (F-178); others become "other" [lib].
  const interactive: unknown = head.interactive;
  if (interactive === null || typeof interactive !== "object" || !("type" in interactive)) {
    return false;
  }
  const subtype: unknown = interactive.type;
  return (
    typeof subtype === "string" &&
    (KNOWN_INTERACTIVE_REPLY_TYPES as readonly string[]).includes(subtype)
  );
}

function toAccountUpdateEvent(
  entryId: string,
  eventTime: number | undefined,
  value: z.output<typeof AccountUpdateValueSchema>,
): WaAccountUpdateEvent {
  const info = value.waba_info;
  const raw: Record<string, unknown> = value;
  return {
    kind: "account_update",
    entryId,
    wabaId: info?.waba_id ?? entryId, // D-32, C-13
    ...(eventTime === undefined ? {} : { eventTime }),
    event: value.event,
    ...(info?.owner_business_id === undefined ? {} : { ownerBusinessId: info.owner_business_id }),
    ...(info?.partner_app_id === undefined ? {} : { partnerAppId: info.partner_app_id }),
    raw,
  };
}

/** `value.metadata.phone_number_id` of an unmodelled change, if it is a string. */
function metadataPhoneNumberId(value: unknown): string | undefined {
  if (value === null || typeof value !== "object" || !("metadata" in value)) {
    return undefined;
  }
  const metadata: unknown = value.metadata;
  if (metadata === null || typeof metadata !== "object" || !("phone_number_id" in metadata)) {
    return undefined;
  }
  const id: unknown = metadata.phone_number_id;
  return typeof id === "string" ? id : undefined;
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
 * - `messages`, `message_template_status_update` (v0.2) and `account_update`
 *   (v0.3) changes are mapped; others are listed in `unhandled` (D-33).
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
  const unhandled: WaUnhandledChange[] = [];

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
      if (change.field === "account_update") {
        const value = parseOrThrow(
          AccountUpdateValueSchema,
          change.value,
          "Invalid account_update webhook value",
        );
        events.push(toAccountUpdateEvent(entry.id, entry.time, value));
        continue;
      }
      if (change.field !== "messages") {
        const phoneNumberId = metadataPhoneNumberId(change.value);
        unhandled.push({
          field: change.field,
          entryId: entry.id,
          ...(entry.time === undefined ? {} : { eventTime: entry.time }),
          ...(phoneNumberId === undefined ? {} : { phoneNumberId }),
          value: change.value,
        });
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
        const message: WaInboundMessage = isKnownType(head)
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
  return { events, unhandled, skippedChanges: unhandled.length };
}
