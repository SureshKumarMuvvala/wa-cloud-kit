import { describe, expect, it } from "vitest";
import {
  WaValidationError,
  parseWebhookPayload,
  reduceMessageStatus,
  type WaMessageDeliveryState,
  type WaMessageStatus,
} from "../../src/index.js";
import { envelope, messagesChange } from "../fixtures/webhooks.js";
import { TEST_RECIPIENT_WA_ID } from "../helpers/ids.js";

const ID = "wamid.test-1";

function update(
  statusValue: string,
  timestamp: string,
  extra: Record<string, unknown> = {},
): WaMessageStatus {
  const { events } = parseWebhookPayload(
    envelope([
      messagesChange({
        statuses: [
          { id: ID, status: statusValue, timestamp, recipient_id: TEST_RECIPIENT_WA_ID, ...extra },
        ],
      }),
    ]),
  );
  const [event] = events;
  if (event?.kind !== "status") throw new Error("expected a status event");
  return event.status;
}

function reduceAll(updates: readonly WaMessageStatus[]): WaMessageDeliveryState {
  let state: WaMessageDeliveryState | undefined;
  for (const u of updates) state = reduceMessageStatus(state, u);
  if (state === undefined) throw new Error("no updates");
  return state;
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
  );
}

const FAILED_ERROR = {
  code: 131049,
  title: "This message was not delivered to maintain healthy ecosystem engagement.",
};
const SENT = update("sent", "1790000001", {
  conversation: {
    id: "test-conversation",
    expiration_timestamp: "1790086401",
    origin: { type: "utility" },
  },
  pricing: { billable: true, pricing_model: "PMP", category: "utility", type: "regular" },
});
const DELIVERED = update("delivered", "1790000002", {
  pricing: {
    billable: false,
    pricing_model: "PMP",
    category: "utility",
    type: "free_customer_service",
  },
});
const READ = update("read", "1790000003");
const PLAYED = update("played", "1790000004");
const FAILED = update("failed", "1790000005", { errors: [FAILED_ERROR] });

describe("happy path (test 79)", () => {
  it("sent → delivered → read gives current read with all timestamps", () => {
    const state = reduceAll([SENT, DELIVERED, READ]);
    expect(state.current).toBe("read");
    expect(state.seen).toEqual({ sent: 1790000001, delivered: 1790000002, read: 1790000003 });
    expect(state.messageId).toBe(ID);
    expect(state.anomalies).toEqual([]);
  });
});

describe("order independence (test 80)", () => {
  it("every permutation of {sent, delivered, read} gives a deep-equal state", () => {
    const reference = reduceAll([SENT, DELIVERED, READ]);
    for (const order of permutations([SENT, DELIVERED, READ])) {
      expect(reduceAll(order)).toEqual(reference);
    }
  });

  it("applying any update twice changes nothing", () => {
    for (const u of [SENT, DELIVERED, READ, PLAYED, FAILED]) {
      const once = reduceAll([SENT, u]);
      expect(reduceMessageStatus(once, u)).toEqual(once);
    }
  });
});

describe("late lower-ranked updates (test 81)", () => {
  it("delivered after read fills seen.delivered and keeps current read", () => {
    const state = reduceAll([READ, DELIVERED]);
    expect(state.current).toBe("read");
    expect(state.seen.delivered).toBe(1790000002);
  });

  it("played ranks above read", () => {
    expect(reduceAll([PLAYED, READ]).current).toBe("played");
    expect(reduceAll([READ, PLAYED]).current).toBe("played");
  });
});

describe("failed (test 82, D-34, G-23)", () => {
  it("sent → failed gives current failed with errors", () => {
    const state = reduceAll([SENT, FAILED]);
    expect(state.current).toBe("failed");
    expect(state.errors).toMatchObject([{ code: 131049 }]);
    expect(reduceAll([FAILED, SENT]).current).toBe("failed");
  });

  it("a positive status beats failed and the conflict is an anomaly", () => {
    const readThenFailed = reduceAll([READ, FAILED]);
    const failedThenRead = reduceAll([FAILED, READ]);
    expect(readThenFailed.current).toBe("read");
    expect(failedThenRead.current).toBe("read");
    expect(readThenFailed.anomalies).toEqual(["failed_after_positive"]);
    expect(failedThenRead.anomalies).toEqual(["positive_after_failed"]);
    expect({ ...readThenFailed, anomalies: [] }).toEqual({ ...failedThenRead, anomalies: [] });
  });
});

describe("unknown statuses (test 83, D-1)", () => {
  it('records "deleted" once and changes nothing else', () => {
    const base = reduceAll([SENT]);
    const deleted = update("deleted", "1790000009");
    const once = reduceMessageStatus(base, deleted);
    const twice = reduceMessageStatus(once, deleted);
    expect(twice.unknownStatuses).toEqual(["deleted"]);
    expect({ ...twice, unknownStatuses: [] }).toEqual(base);
  });

  it('starts as "unknown" when the first update is unknown', () => {
    const state = reduceMessageStatus(undefined, update("deleted", "1790000009"));
    expect(state.current).toBe("unknown");
    expect(state.seen).toEqual({});
  });
});

describe("pass-through fields (test 84)", () => {
  it("follows the greatest (timestamp, rank) regardless of order", () => {
    for (const order of permutations([SENT, DELIVERED, READ])) {
      const state = reduceAll(order);
      expect(state.pricing).toEqual(DELIVERED.pricing);
      expect(state.conversation).toEqual(SENT.conversation);
    }
  });

  it("breaks timestamp ties by rank", () => {
    const sentSame = update("sent", "1790000010", { pricing: { category: "a" } });
    const deliveredSame = update("delivered", "1790000010", { pricing: { category: "b" } });
    expect(reduceAll([sentSame, deliveredSame]).pricing).toEqual({ category: "b" });
    expect(reduceAll([deliveredSame, sentSame]).pricing).toEqual({ category: "b" });
  });

  it("ignores a non-numeric timestamp for seen but still counts the status", () => {
    const state = reduceAll([update("delivered", "not-a-number")]);
    expect(state.current).toBe("delivered");
    expect(state.seen).toEqual({ delivered: null });
    expect(reduceMessageStatus(state, DELIVERED).seen).toEqual({ delivered: 1790000002 });
  });
});

describe("guards (test 85)", () => {
  it("rejects an update for another message and never mutates the input", () => {
    const state = Object.freeze(reduceAll([SENT]));
    const other = { ...READ, id: "wamid.test-2" };
    expect(() => reduceMessageStatus(state, other)).toThrow(WaValidationError);
    const snapshot = structuredClone(state);
    reduceMessageStatus(state, READ);
    expect(state).toEqual(snapshot);
  });
});
