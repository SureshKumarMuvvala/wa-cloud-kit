import { WaValidationError } from "../errors.js";
import type { WaMessageStatus, WaWebhookError } from "./schemas.js";

/** The statuses the reducer tracks (F-176). */
export type WaDeliveryStatus = "sent" | "delivered" | "read" | "played" | "failed";

/**
 * Rank derived from the status meanings (F-176, D-34, G-22) [lib]: sent "from
 * our servers" < delivered "to the WhatsApp user's device" < read "displayed
 * in an open chat thread" < played "the first time a voice message is
 * played". `failed` is outside the ranking.
 */
export const DELIVERY_STATUS_RANK = { sent: 1, delivered: 2, read: 3, played: 4 } as const;

type PositiveStatus = keyof typeof DELIVERY_STATUS_RANK;
const POSITIVE_STATUSES = ["sent", "delivered", "read", "played"] as const;

/** `[timestamp, rank]` of the update a pass-through field was taken from. */
type Origin = readonly [number, number];

/** Delivery state of one sent message. The caller stores it (v0.3 §2.6). */
export interface WaMessageDeliveryState {
  messageId: string;
  /** Highest-ranked status seen; `failed` beats `sent` only; `"unknown"` until a known status arrives. */
  current: WaDeliveryStatus | "unknown";
  /**
   * Smallest webhook timestamp (Unix seconds) seen per status; `null` when the
   * status was seen only with a non-numeric timestamp.
   */
  seen: Partial<Record<WaDeliveryStatus, number | null>>;
  /** Errors from `failed` updates, unique by code, sorted by code. */
  errors: WaWebhookError[];
  /** Passed through, not interpreted (F-091). */
  pricing?: WaMessageStatus["pricing"];
  /** Passed through; `expiration_timestamp` only on `sent` (F-176); mostly absent on v24.0+ (F-091). */
  conversation?: WaMessageStatus["conversation"];
  /** A positive status and `failed` were both seen; the label records which came first (G-23). */
  anomalies: ("failed_after_positive" | "positive_after_failed")[];
  /** Status strings outside F-091's list (D-1), sorted, without repeats. */
  unknownStatuses: string[];
  /** Where `pricing`/`conversation` came from, so later updates merge in order. Opaque. */
  origins: { pricing?: Origin; conversation?: Origin };
}

function toSeconds(timestamp: string): number | null {
  return /^\d+$/.test(timestamp) ? Number(timestamp) : null;
}

function rankOf(status: WaDeliveryStatus): number {
  return status === "failed" ? 0 : DELIVERY_STATUS_RANK[status];
}

/** `delivered`, `read` or `played` seen: evidence the message reached the device. */
function reachedDevice(seen: WaMessageDeliveryState["seen"]): boolean {
  return "delivered" in seen || "read" in seen || "played" in seen;
}

function deriveCurrent(seen: WaMessageDeliveryState["seen"]): WaMessageDeliveryState["current"] {
  let best: PositiveStatus | undefined;
  for (const status of POSITIVE_STATUSES) {
    if (status in seen) {
      best = status;
    }
  }
  if (best !== undefined && DELIVERY_STATUS_RANK[best] >= DELIVERY_STATUS_RANK.delivered) {
    return best;
  }
  if ("failed" in seen) {
    return "failed"; // beats `sent` only (D-34)
  }
  return best ?? "unknown";
}

function later(a: Origin, b: Origin | undefined): boolean {
  return b === undefined || a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);
}

/**
 * Pure reducer over one message's status webhooks (v0.3 §2.6, D-34).
 *
 * - `current` is the highest-ranked status seen; a lower-ranked update that
 *   arrives later only fills `seen`.
 * - A positive status (`delivered`, `read`, `played`) beats `failed`; the
 *   conflict is kept in `anomalies` (G-23). Without one, `failed` beats `sent`.
 * - Unknown statuses are recorded and change nothing else (D-1).
 * - `pricing`/`conversation` come from the update with the greatest
 *   `(timestamp, rank)`; ties keep the existing value.
 *
 * Applying the same set of updates in any order gives a deep-equal state
 * (apart from the anomaly label), and applying an update twice changes
 * nothing. Whether a message was dropped is not decided here: if no
 * `delivered` arrives within the TTL, assume it was dropped; a `failed` may
 * arrive after a minor delay (F-177).
 *
 * Throws {@link WaValidationError} if `update.id` is not the state's message.
 * The input state is never mutated.
 */
export function reduceMessageStatus(
  state: WaMessageDeliveryState | undefined,
  update: WaMessageStatus,
): WaMessageDeliveryState {
  if (state !== undefined && update.id !== state.messageId) {
    throw new WaValidationError("Status update is for a different message", []);
  }
  const base: WaMessageDeliveryState = state ?? {
    messageId: update.id,
    current: "unknown",
    seen: {},
    errors: [],
    anomalies: [],
    unknownStatuses: [],
    origins: {},
  };
  const next: WaMessageDeliveryState = {
    ...base,
    seen: { ...base.seen },
    errors: [...base.errors],
    anomalies: [...base.anomalies],
    unknownStatuses: [...base.unknownStatuses],
    origins: { ...base.origins },
  };

  if (!update.known) {
    if (!next.unknownStatuses.includes(update.status)) {
      next.unknownStatuses = [...next.unknownStatuses, update.status].sort();
    }
    return next;
  }

  const status = update.status;
  const at = toSeconds(update.timestamp);
  const wasOnDevice = reachedDevice(base.seen);
  const wasFailed = "failed" in base.seen;

  const previous = next.seen[status];
  if (previous === undefined || previous === null) {
    next.seen[status] = at;
  } else if (at !== null) {
    next.seen[status] = Math.min(previous, at);
  }

  if (status === "failed") {
    for (const error of update.errors ?? []) {
      if (!next.errors.some((known) => known.code === error.code)) {
        next.errors.push(error);
      }
    }
    next.errors.sort((a, b) => a.code - b.code);
    if (wasOnDevice) {
      addAnomaly(next, "failed_after_positive");
    }
  } else if (rankOf(status) >= DELIVERY_STATUS_RANK.delivered && wasFailed && !wasOnDevice) {
    addAnomaly(next, "positive_after_failed");
  }

  const origin: Origin = [at ?? -1, rankOf(status)];
  if (update.pricing !== undefined && later(origin, next.origins.pricing)) {
    next.pricing = update.pricing;
    next.origins.pricing = origin;
  }
  if (update.conversation !== undefined && later(origin, next.origins.conversation)) {
    next.conversation = update.conversation;
    next.origins.conversation = origin;
  }

  next.current = deriveCurrent(next.seen);
  return next;
}

function addAnomaly(
  state: WaMessageDeliveryState,
  anomaly: WaMessageDeliveryState["anomalies"][number],
): void {
  if (!state.anomalies.includes(anomaly)) {
    state.anomalies.push(anomaly);
  }
}
