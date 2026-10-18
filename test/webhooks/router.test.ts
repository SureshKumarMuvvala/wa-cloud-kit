import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_DEDUPE_TTL_SECONDS,
  WaValidationError,
  createWebhookRouter,
  parseWebhookPayload,
  webhookDedupeKey,
  type ParsedWebhook,
  type WaIdempotencyStore,
  type WaRoutingKey,
} from "../../src/index.js";
import {
  STATUS_SENT,
  TEXT_MESSAGE,
  VALUE_ERROR,
  messagesChange,
  status,
} from "../fixtures/webhooks.js";
import {
  TEST_PARTNER_PORTFOLIO_ID,
  TEST_PHONE_NUMBER_ID,
  TEST_TEMPLATE_ID,
  TEST_WABA_ID,
} from "../helpers/ids.js";

const TEMPLATE_CHANGE = {
  field: "message_template_status_update",
  value: {
    event: "APPROVED",
    message_template_id: Number(TEST_TEMPLATE_ID),
    message_template_name: "invoice_with_pdf",
    message_template_language: "en_US",
    reason: "NONE",
  },
};
const ACCOUNT_CHANGE = {
  field: "account_update",
  value: { event: "PARTNER_ADDED", waba_info: { waba_id: TEST_WABA_ID } },
};
const QUALITY_CHANGE = { field: "phone_number_quality_update", value: { event: "FLAGGED" } };

/** One payload with every kind: message, status, error, template, account, unhandled. */
function mixedPayload(): ParsedWebhook {
  return parseWebhookPayload({
    object: "whatsapp_business_account",
    entry: [
      {
        id: TEST_WABA_ID,
        time: 1790000400,
        changes: [
          messagesChange({
            messages: [TEXT_MESSAGE],
            statuses: [STATUS_SENT],
            errors: [VALUE_ERROR],
          }),
          TEMPLATE_CHANGE,
          QUALITY_CHANGE,
        ],
      },
      { id: TEST_PARTNER_PORTFOLIO_ID, time: 1790000401, changes: [ACCOUNT_CHANGE] },
    ],
  });
}

/** In-memory fake store; demo/test only. */
function memoryStore(options: { failOn?: number; withRelease?: boolean } = {}) {
  const keys = new Map<string, number>();
  const claims: { key: string; ttl: number }[] = [];
  const released: string[] = [];
  const store: WaIdempotencyStore = {
    claim: (key, ttl) => {
      claims.push({ key, ttl });
      if (options.failOn !== undefined && claims.length === options.failOn) {
        return Promise.reject(new Error("store down"));
      }
      if (keys.has(key)) return Promise.resolve(false);
      keys.set(key, ttl);
      return Promise.resolve(true);
    },
  };
  if (options.withRelease !== false) {
    store.release = (key) => {
      released.push(key);
      keys.delete(key);
      return Promise.resolve();
    };
  }
  return { store, claims, released, keys };
}

const everyone = (key: WaRoutingKey) => `tenant:${key.wabaId}`;

describe("routing keys (test 70)", () => {
  it("follows the §2.2 table", async () => {
    const router = createWebhookRouter({ resolveTenant: everyone });
    const result = await router.route(mixedPayload());
    const keys = [...result.routed.map((r) => r.key), ...result.unhandled.map((u) => u.key)];
    expect(keys).toEqual([
      {
        field: "messages",
        wabaId: TEST_WABA_ID,
        phoneNumberId: TEST_PHONE_NUMBER_ID,
        source: "metadata",
      },
      {
        field: "messages",
        wabaId: TEST_WABA_ID,
        phoneNumberId: TEST_PHONE_NUMBER_ID,
        source: "metadata",
      },
      {
        field: "messages",
        wabaId: TEST_WABA_ID,
        phoneNumberId: TEST_PHONE_NUMBER_ID,
        source: "metadata",
      },
      { field: "message_template_status_update", wabaId: TEST_WABA_ID, source: "entry" },
      { field: "account_update", wabaId: TEST_WABA_ID, source: "waba_info" },
      { field: "phone_number_quality_update", wabaId: TEST_WABA_ID, source: "entry" },
    ]);
    for (const key of keys.slice(3)) expect(key).not.toHaveProperty("phoneNumberId");
  });
});

describe("result lists (test 71)", () => {
  it("puts every item in exactly one list, in payload order", async () => {
    const parsed = mixedPayload();
    const router = createWebhookRouter({
      resolveTenant: (key) => (key.field === "account_update" ? null : "t1"),
    });
    const result = await router.route(parsed);
    const total =
      result.routed.length +
      result.duplicates.length +
      result.unrouted.length +
      result.unhandled.length;
    expect(total).toBe(parsed.events.length + parsed.unhandled.length);
    expect(result.routed.map((r) => r.event.kind)).toEqual([
      "message",
      "status",
      "error",
      "template_status",
    ]);
    expect(result.unrouted.map((u) => u.key.field)).toEqual(["account_update"]);
    expect(result.unhandled.map((u) => u.change.field)).toEqual(["phone_number_quality_update"]);
  });
});

describe("unknown tenant (test 72, D-43)", () => {
  it.each([null, undefined])("resolver returning %s → unrouted and never claimed", async (none) => {
    const { store, claims } = memoryStore();
    const router = createWebhookRouter({ resolveTenant: () => none, idempotency: store });
    const parsed = mixedPayload();
    const result = await router.route(parsed);
    expect(result.routed).toEqual([]);
    expect(result.unrouted).toHaveLength(parsed.events.length + parsed.unhandled.length);
    expect(new Set(result.unrouted.map((u) => u.reason))).toEqual(new Set(["unknown_tenant"]));
    expect(claims).toEqual([]);
  });
});

describe("resolver memo (test 73)", () => {
  it("calls the resolver once per distinct key per route() call", async () => {
    const resolveTenant = vi.fn((key: WaRoutingKey) => key.wabaId);
    const router = createWebhookRouter({ resolveTenant });
    const parsed = parseWebhookPayload({
      object: "whatsapp_business_account",
      entry: [
        {
          id: TEST_WABA_ID,
          changes: [
            messagesChange({
              statuses: [status("sent", "wamid.a"), status("delivered", "wamid.a")],
            }),
            messagesChange({ statuses: [status("read", "wamid.a")] }),
          ],
        },
      ],
    });
    await router.route(parsed);
    expect(resolveTenant).toHaveBeenCalledTimes(1);
    await router.route(parsed);
    expect(resolveTenant).toHaveBeenCalledTimes(2);
  });

  it("supports async resolvers", async () => {
    const router = createWebhookRouter({ resolveTenant: (key) => Promise.resolve(key.wabaId) });
    const result = await router.route(mixedPayload());
    expect(result.routed[0]?.tenant).toBe(TEST_WABA_ID);
  });
});

describe("resolver failure (test 74)", () => {
  it("rejects before any claim", async () => {
    const { store, claims } = memoryStore();
    let calls = 0;
    const router = createWebhookRouter({
      resolveTenant: () => {
        calls += 1;
        if (calls === 2) throw new Error("db down");
        return "t1";
      },
      idempotency: store,
    });
    await expect(router.route(mixedPayload())).rejects.toThrow("db down");
    expect(claims).toEqual([]);
  });
});

describe("dedupe (test 75, D-31)", () => {
  it("routes the first delivery and marks a redelivery as duplicates; errors are never deduped", async () => {
    const { store, claims } = memoryStore();
    const router = createWebhookRouter({ resolveTenant: () => "t1", idempotency: store });
    const first = await router.route(mixedPayload());
    expect(first.routed.map((r) => r.event.kind)).toEqual([
      "message",
      "status",
      "error",
      "template_status",
      "account_update",
    ]);
    const second = await router.route(mixedPayload());
    expect(second.routed.map((r) => r.event.kind)).toEqual(["error"]);
    expect(second.routed[0]?.dedupeKey).toBeNull();
    expect(second.duplicates.map((d) => d.event.kind)).toEqual([
      "message",
      "status",
      "template_status",
      "account_update",
    ]);
    expect(claims.every((c) => c.ttl === DEFAULT_DEDUPE_TTL_SECONDS)).toBe(true);
    expect(DEFAULT_DEDUPE_TTL_SECONDS).toBe(691_200);
  });

  it("uses a configured TTL and rejects an invalid one", async () => {
    const { store, claims } = memoryStore();
    await createWebhookRouter({
      resolveTenant: () => "t1",
      idempotency: store,
      dedupeTtlSeconds: 60,
    }).route(mixedPayload());
    expect(claims.every((c) => c.ttl === 60)).toBe(true);
    for (const bad of [0, -1, 1.5]) {
      expect(() =>
        createWebhookRouter({ resolveTenant: () => "t1", dedupeTtlSeconds: bad }),
      ).toThrow(WaValidationError);
    }
  });

  it("treats the same message twice in one payload as one routed and one duplicate", async () => {
    const { store } = memoryStore();
    const router = createWebhookRouter({ resolveTenant: () => "t1", idempotency: store });
    const parsed = parseWebhookPayload({
      object: "whatsapp_business_account",
      entry: [
        { id: TEST_WABA_ID, changes: [messagesChange({ messages: [TEXT_MESSAGE, TEXT_MESSAGE] })] },
      ],
    });
    const result = await router.route(parsed);
    expect(result.routed).toHaveLength(1);
    expect(result.duplicates).toHaveLength(1);
  });
});

describe("store failure (test 76)", () => {
  it("releases keys claimed in this call, then rejects with the store error", async () => {
    const { store, released } = memoryStore({ failOn: 3 });
    const router = createWebhookRouter({ resolveTenant: () => "t1", idempotency: store });
    await expect(router.route(mixedPayload())).rejects.toThrow("store down");
    expect(released).toEqual([
      `wa:msg:${TEST_PHONE_NUMBER_ID}:${TEXT_MESSAGE.id}`,
      `wa:st:${TEST_PHONE_NUMBER_ID}:${STATUS_SENT.id}:sent`,
    ]);
  });

  it("just rejects when the store has no release", async () => {
    const { store } = memoryStore({ failOn: 1, withRelease: false });
    const router = createWebhookRouter({ resolveTenant: () => "t1", idempotency: store });
    await expect(router.route(mixedPayload())).rejects.toThrow("store down");
  });
});

describe("webhookDedupeKey (test 77)", () => {
  it("matches the §2.4 table", () => {
    const parsed = mixedPayload();
    expect(parsed.events.map(webhookDedupeKey)).toEqual([
      `wa:msg:${TEST_PHONE_NUMBER_ID}:${TEXT_MESSAGE.id}`,
      `wa:st:${TEST_PHONE_NUMBER_ID}:${STATUS_SENT.id}:sent`,
      null,
      `wa:tpl:${TEST_WABA_ID}:${TEST_TEMPLATE_ID}:APPROVED:1790000400`,
      `wa:acct:${TEST_WABA_ID}:PARTNER_ADDED:1790000401`,
    ]);
  });

  it('uses "-" for a missing eventTime', () => {
    const parsed = parseWebhookPayload({
      object: "whatsapp_business_account",
      entry: [{ id: TEST_WABA_ID, changes: [TEMPLATE_CHANGE, ACCOUNT_CHANGE] }],
    });
    expect(parsed.events.map(webhookDedupeKey)).toEqual([
      `wa:tpl:${TEST_WABA_ID}:${TEST_TEMPLATE_ID}:APPROVED:-`,
      `wa:acct:${TEST_WABA_ID}:PARTNER_ADDED:-`,
    ]);
  });
});

describe("no idempotency store (test 78)", () => {
  it("routes every resolved event and still computes dedupe keys", async () => {
    const router = createWebhookRouter({ resolveTenant: () => "t1" });
    const first = await router.route(mixedPayload());
    const second = await router.route(mixedPayload());
    expect(second.routed).toEqual(first.routed);
    expect(first.duplicates).toEqual([]);
    expect(first.routed[0]?.dedupeKey).toBe(`wa:msg:${TEST_PHONE_NUMBER_ID}:${TEXT_MESSAGE.id}`);
  });
});
