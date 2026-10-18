import type { WaWebhookEvent } from "./parse.js";

/**
 * Default dedupe TTL in seconds: Meta retries failed deliveries for up to 7
 * days (F-083, F-170), plus one day of margin [lib] (D-31).
 */
export const DEFAULT_DEDUPE_TTL_SECONDS = 691_200;

/**
 * An idempotency store supplied by the caller (v0.3 §2.4). The library keeps
 * no store of its own.
 *
 * `claim` must be atomic across every process that handles this app's
 * webhooks (for example Redis `SET key 1 NX EX ttl`). An in-memory map is fine
 * only for tests and demos.
 */
export interface WaIdempotencyStore {
  /** Atomically record `key` for `ttlSeconds` if it is absent. Resolve `true` if this call recorded it. */
  claim(key: string, ttlSeconds: number): Promise<boolean>;
  /** Optional. Forget `key`, so a later redelivery is processed again. */
  release?(key: string): Promise<void>;
}

/**
 * The dedupe key of an event (D-31, G-26) [lib], or `null` when the event is
 * never deduped. Pure.
 *
 * | Event | Key |
 * |---|---|
 * | message | `wa:msg:{phoneNumberId}:{message.id}` |
 * | status | `wa:st:{phoneNumberId}:{status.id}:{status.status}` |
 * | template_status | `wa:tpl:{wabaId}:{templateId}:{event}:{eventTime ?? "-"}` |
 * | account_update | `wa:acct:{wabaId}:{event}:{eventTime ?? "-"}` |
 * | error | `null` (no id in the payload, F-086, F-092) |
 */
export function webhookDedupeKey(event: WaWebhookEvent): string | null {
  switch (event.kind) {
    case "message":
      return `wa:msg:${event.phoneNumberId}:${event.message.id}`;
    case "status":
      return `wa:st:${event.phoneNumberId}:${event.status.id}:${event.status.status}`;
    case "template_status":
      return `wa:tpl:${event.wabaId}:${event.templateId}:${event.event}:${timePart(event.eventTime)}`;
    case "account_update":
      return `wa:acct:${event.wabaId}:${event.event}:${timePart(event.eventTime)}`;
    case "error":
      return null;
  }
}

function timePart(eventTime: number | undefined): string {
  return eventTime === undefined ? "-" : String(eventTime);
}
