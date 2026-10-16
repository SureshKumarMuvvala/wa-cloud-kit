import type { z } from "zod";
import { WaValidationError } from "../errors.js";
import {
  ContactSchema,
  KNOWN_MESSAGE_TYPES,
  KnownMessageSchema,
  MessagesValueSchema,
  OtherMessageSchema,
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

export type WaWebhookEvent =
  | (WebhookEventBase & { kind: "message"; contact?: WaWebhookContact; message: WaInboundMessage })
  | (WebhookEventBase & { kind: "status"; status: WaMessageStatus })
  | (WebhookEventBase & { kind: "error"; error: WaWebhookError });

export interface ParsedWebhook {
  events: WaWebhookEvent[];
  /** Changes whose `field` is not `messages` (group_* and future fields). */
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
 * - Only `field === "messages"` changes are mapped; others increment
 *   `skippedChanges` [lib].
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
