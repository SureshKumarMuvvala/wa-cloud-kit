import { z } from "zod";
import { parseInput } from "../messages/common.js";
import { DEFAULT_DEDUPE_TTL_SECONDS, webhookDedupeKey, type WaIdempotencyStore } from "./dedupe.js";
import type { ParsedWebhook, WaUnhandledChange, WaWebhookEvent } from "./parse.js";

/**
 * What the router knows about where a change came from (v0.3 §2.2).
 * `source` says where `wabaId` was taken from.
 */
export interface WaRoutingKey {
  /** `messages`, `message_template_status_update`, `account_update`, … */
  field: string;
  wabaId: string;
  /** Only for changes that carry `value.metadata` (F-085). */
  phoneNumberId?: string;
  source: "metadata" | "entry" | "waba_info";
}

/**
 * Caller-supplied tenant lookup (D-30). Return `null`/`undefined` for an
 * unknown tenant. Recommended: look up by `phoneNumberId` when present, else by
 * `wabaId`; when both are present, check that the tenant owns that WABA.
 */
export type WaTenantResolver<T> = (
  key: WaRoutingKey,
) => T | null | undefined | Promise<T | null | undefined>;

export interface WaWebhookRouterOptions<T> {
  resolveTenant: WaTenantResolver<T>;
  /** Omitted → no dedupe; every resolved event is routed. */
  idempotency?: WaIdempotencyStore;
  /** Positive integer; default {@link DEFAULT_DEDUPE_TTL_SECONDS} (D-31). */
  dedupeTtlSeconds?: number;
}

export interface WaRoutedEvent<T> {
  tenant: T;
  key: WaRoutingKey;
  event: WaWebhookEvent;
  dedupeKey: string | null;
}

export interface WaDuplicateEvent<T> {
  tenant: T;
  key: WaRoutingKey;
  event: WaWebhookEvent;
  dedupeKey: string;
}

export interface WaUnroutedItem {
  key: WaRoutingKey;
  item: WaWebhookEvent | WaUnhandledChange;
  reason: "unknown_tenant";
}

export interface WaRoutedUnhandledChange<T> {
  tenant: T;
  key: WaRoutingKey;
  change: WaUnhandledChange;
}

/**
 * Every event and unhandled change lands in exactly one list; payload order
 * is kept within each list (v0.3 §2.3).
 */
export interface WaRouteResult<T> {
  routed: WaRoutedEvent<T>[];
  duplicates: WaDuplicateEvent<T>[];
  unrouted: WaUnroutedItem[];
  unhandled: WaRoutedUnhandledChange<T>[];
}

export interface WaWebhookRouter<T> {
  route(parsed: ParsedWebhook): Promise<WaRouteResult<T>>;
}

const RouterOptionsSchema = z.object({
  dedupeTtlSeconds: z.int().positive().optional(),
});

/** Routing key per v0.3 §2.2 (F-085, F-117, F-161, F-174, C-13, D-32). */
function eventRoutingKey(event: WaWebhookEvent): WaRoutingKey {
  switch (event.kind) {
    case "message":
    case "status":
    case "error":
      return {
        field: "messages",
        wabaId: event.wabaId,
        phoneNumberId: event.phoneNumberId,
        source: "metadata",
      };
    case "template_status":
      // No metadata on template events (F-117); route by WABA (F-161).
      return { field: "message_template_status_update", wabaId: event.wabaId, source: "entry" };
    case "account_update":
      return {
        field: "account_update",
        wabaId: event.wabaId,
        source: event.wabaId === event.entryId ? "entry" : "waba_info",
      };
  }
}

function changeRoutingKey(change: WaUnhandledChange): WaRoutingKey {
  return change.phoneNumberId === undefined
    ? { field: change.field, wabaId: change.entryId, source: "entry" }
    : {
        field: change.field,
        wabaId: change.entryId,
        phoneNumberId: change.phoneNumberId,
        source: "metadata",
      };
}

function memoKey(key: WaRoutingKey): string {
  return [key.field, key.wabaId, key.phoneNumberId ?? "", key.source].join("\u0000");
}

/**
 * Creates a router (v0.3 §2). It holds only the options: no tenant table, no
 * dedupe set, no cache across calls [lib].
 *
 * `route()`:
 * 1. resolves every distinct key once (memo local to the call); a resolver
 *    that throws rejects `route()` before anything is claimed;
 * 2. puts unknown tenants in `unrouted` without claiming them (D-43);
 * 3. claims each routed event's dedupe key (D-31); `true` → `routed`, `false`
 *    → `duplicates`; events whose key is `null` are always routed;
 * 4. if `claim` rejects, releases the keys it claimed in this call (when the
 *    store has `release`) and rejects with the store's error.
 */
export function createWebhookRouter<T>(options: WaWebhookRouterOptions<T>): WaWebhookRouter<T> {
  const parsedOptions = parseInput(
    RouterOptionsSchema,
    { dedupeTtlSeconds: options.dedupeTtlSeconds },
    "Invalid webhook router options",
  );
  const ttl = parsedOptions.dedupeTtlSeconds ?? DEFAULT_DEDUPE_TTL_SECONDS;
  const { resolveTenant, idempotency } = options;

  return {
    route: async (parsed) => {
      const memo = new Map<string, T | null>();
      const resolve = async (key: WaRoutingKey): Promise<T | null> => {
        const id = memoKey(key);
        if (memo.has(id)) {
          return memo.get(id) ?? null;
        }
        const tenant = (await resolveTenant(key)) ?? null;
        memo.set(id, tenant);
        return tenant;
      };

      // 1. Resolve everything before claiming anything.
      const events: { event: WaWebhookEvent; key: WaRoutingKey; tenant: T | null }[] = [];
      for (const event of parsed.events) {
        const key = eventRoutingKey(event);
        events.push({ event, key, tenant: await resolve(key) });
      }
      const changes: { change: WaUnhandledChange; key: WaRoutingKey; tenant: T | null }[] = [];
      for (const change of parsed.unhandled) {
        const key = changeRoutingKey(change);
        changes.push({ change, key, tenant: await resolve(key) });
      }

      const result: WaRouteResult<T> = { routed: [], duplicates: [], unrouted: [], unhandled: [] };
      const claimed: string[] = [];
      try {
        for (const { event, key, tenant } of events) {
          if (tenant === null) {
            result.unrouted.push({ key, item: event, reason: "unknown_tenant" });
            continue;
          }
          const dedupeKey = webhookDedupeKey(event);
          if (dedupeKey === null || idempotency === undefined) {
            result.routed.push({ tenant, key, event, dedupeKey });
            continue;
          }
          if (await idempotency.claim(dedupeKey, ttl)) {
            claimed.push(dedupeKey);
            result.routed.push({ tenant, key, event, dedupeKey });
          } else {
            result.duplicates.push({ tenant, key, event, dedupeKey });
          }
        }
      } catch (error) {
        if (idempotency?.release !== undefined) {
          for (const key of claimed) {
            try {
              await idempotency.release(key);
            } catch {
              // The original store error is what the caller needs [lib].
            }
          }
        }
        throw error;
      }

      for (const { change, key, tenant } of changes) {
        if (tenant === null) {
          result.unrouted.push({ key, item: change, reason: "unknown_tenant" });
        } else {
          result.unhandled.push({ tenant, key, change });
        }
      }
      return result;
    },
  };
}
