import { describe, expect, it } from "vitest";
import { WaValidationError, parseWebhookPayload, type WaWebhookEvent } from "../../src/index.js";
import { CONTACT, METADATA, envelope, messagesChange } from "../fixtures/webhooks.js";
import {
  TEST_BUSINESS_ID,
  TEST_PARTNER_PORTFOLIO_ID,
  TEST_PHONE_NUMBER_ID,
  TEST_RECIPIENT_WA_ID,
  TEST_WABA_ID,
} from "../helpers/ids.js";

function interactive(value: Record<string, unknown>): Record<string, unknown> {
  return {
    context: { from: "15550000000", id: "wamid.test-business-1" },
    from: TEST_RECIPIENT_WA_ID,
    id: "wamid.test-reply-1",
    timestamp: "1790000100",
    type: "interactive",
    interactive: value,
  };
}

function onlyMessage(events: WaWebhookEvent[]) {
  expect(events).toHaveLength(1);
  const [event] = events;
  if (event?.kind !== "message") throw new Error("expected a message event");
  return event.message;
}

describe("interactive replies (test 67, F-178)", () => {
  it("parses button_reply with context", () => {
    const parsed = parseWebhookPayload(
      envelope([
        messagesChange({
          contacts: [CONTACT],
          messages: [
            interactive({
              type: "button_reply",
              button_reply: { id: "send-pdf", title: "Send PDF" },
            }),
          ],
        }),
      ]),
    );
    const message = onlyMessage(parsed.events);
    expect(message).toMatchObject({
      type: "interactive",
      context: { id: "wamid.test-business-1" },
      interactive: { type: "button_reply", button_reply: { id: "send-pdf", title: "Send PDF" } },
    });
  });

  it("parses list_reply with and without description", () => {
    const withDescription = onlyMessage(
      parseWebhookPayload(
        envelope([
          messagesChange({
            messages: [
              interactive({
                type: "list_reply",
                list_reply: { id: "pay-now", title: "Pay now", description: "Card or bank" },
              }),
            ],
          }),
        ]),
      ).events,
    );
    expect(withDescription).toMatchObject({
      type: "interactive",
      interactive: { list_reply: { id: "pay-now", title: "Pay now", description: "Card or bank" } },
    });
    const without = onlyMessage(
      parseWebhookPayload(
        envelope([
          messagesChange({
            messages: [
              interactive({ type: "list_reply", list_reply: { id: "later", title: "Later" } }),
            ],
          }),
        ]),
      ).events,
    );
    if (without.type !== "interactive" || without.interactive.type !== "list_reply") {
      throw new Error("expected list_reply");
    }
    expect(without.interactive.list_reply.description).toBeUndefined();
  });

  it("turns an unknown interactive.type into type other", () => {
    const message = onlyMessage(
      parseWebhookPayload(
        envelope([
          messagesChange({
            messages: [interactive({ type: "nfm_reply", nfm_reply: { body: "x" } })],
          }),
        ]),
      ).events,
    );
    expect(message).toMatchObject({ type: "other", originalType: "interactive" });
  });

  it("rejects a button_reply without an id", () => {
    expect(() =>
      parseWebhookPayload(
        envelope([
          messagesChange({
            messages: [interactive({ type: "button_reply", button_reply: { title: "x" } })],
          }),
        ]),
      ),
    ).toThrow(WaValidationError);
  });
});

function accountUpdate(
  value: Record<string, unknown>,
  entryId = TEST_PARTNER_PORTFOLIO_ID,
): unknown {
  return {
    object: "whatsapp_business_account",
    entry: [{ id: entryId, time: 1790000200, changes: [{ field: "account_update", value }] }],
  };
}

describe("account_update (test 68, F-174, C-13, D-32)", () => {
  it.each([
    ["PARTNER_ADDED", {}],
    ["PARTNER_APP_INSTALLED", { partner_app_id: "500000000000005" }],
    ["PARTNER_APP_UNINSTALLED", { partner_app_id: "500000000000005" }],
    ["PARTNER_REMOVED", {}],
  ])("%s takes wabaId from waba_info and keeps entryId", (event, extra) => {
    const { events } = parseWebhookPayload(
      accountUpdate({
        event,
        waba_info: { waba_id: TEST_WABA_ID, owner_business_id: TEST_BUSINESS_ID, ...extra },
      }),
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "account_update",
      entryId: TEST_PARTNER_PORTFOLIO_ID,
      wabaId: TEST_WABA_ID,
      eventTime: 1790000200,
      event,
      ownerBusinessId: TEST_BUSINESS_ID,
      ...("partner_app_id" in extra ? { partnerAppId: "500000000000005" } : {}),
    });
  });

  it("falls back to entry.id without waba_info and keeps unknown events and raw", () => {
    const { events } = parseWebhookPayload(
      accountUpdate({ event: "ACCOUNT_RECONNECTED", extra_field: 1 }, TEST_WABA_ID),
    );
    expect(events[0]).toEqual({
      kind: "account_update",
      entryId: TEST_WABA_ID,
      wabaId: TEST_WABA_ID,
      eventTime: 1790000200,
      event: "ACCOUNT_RECONNECTED",
      raw: { event: "ACCOUNT_RECONNECTED", extra_field: 1 },
    });
  });

  it("rejects an account_update value without event", () => {
    expect(() => parseWebhookPayload(accountUpdate({}))).toThrow(WaValidationError);
  });
});

describe("unhandled changes (test 69, D-33)", () => {
  it("lists unknown fields with entryId, metadata phone number and raw value", () => {
    const quality = { display_phone_number: "15550000000", current_limit: "TIER_1K" };
    const withMetadata = { metadata: METADATA, something: true };
    const parsed = parseWebhookPayload({
      object: "whatsapp_business_account",
      entry: [
        {
          id: TEST_WABA_ID,
          time: 1790000300,
          changes: [
            { field: "phone_number_quality_update", value: quality },
            { field: "some_future_field", value: withMetadata },
          ],
        },
      ],
    });
    expect(parsed.events).toEqual([]);
    expect(parsed.unhandled).toEqual([
      {
        field: "phone_number_quality_update",
        entryId: TEST_WABA_ID,
        eventTime: 1790000300,
        value: quality,
      },
      {
        field: "some_future_field",
        entryId: TEST_WABA_ID,
        eventTime: 1790000300,
        phoneNumberId: TEST_PHONE_NUMBER_ID,
        value: withMetadata,
      },
    ]);
    expect(parsed.skippedChanges).toBe(parsed.unhandled.length);
  });
});
