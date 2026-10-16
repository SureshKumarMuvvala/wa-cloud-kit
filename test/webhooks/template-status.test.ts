import { describe, expect, it } from "vitest";
import {
  TEMPLATE_STATUS_EVENTS,
  WaValidationError,
  parseWebhookPayload,
  type WaTemplateStatusEvent,
  type WaWebhookEvent,
} from "../../src/index.js";
import { METADATA, envelope, messagesChange, TEXT_MESSAGE } from "../fixtures/webhooks.js";
import { TEST_WABA_ID } from "../helpers/ids.js";

const TEMPLATE_ID = 300000000000003; // integer on the wire (F-117, G-15)

function change(value: Record<string, unknown>): unknown {
  return {
    field: "message_template_status_update",
    value: {
      event: "APPROVED",
      message_template_id: TEMPLATE_ID,
      message_template_name: "invoice_with_pdf",
      message_template_language: "en_US",
      reason: "NONE",
      message_template_category: "UTILITY",
      ...value,
    },
  };
}

function wrap(value: Record<string, unknown>, time?: number): unknown {
  return {
    object: "whatsapp_business_account",
    entry: [
      { id: TEST_WABA_ID, ...(time === undefined ? {} : { time }), changes: [change(value)] },
    ],
  };
}

function onlyTemplate(events: WaWebhookEvent[]): WaTemplateStatusEvent {
  expect(events).toHaveLength(1);
  const [event] = events;
  if (event?.kind !== "template_status") throw new Error("expected a template_status event");
  return event;
}

describe("template_status mapping (test 63)", () => {
  it("maps an approval, turning the integer id into a string", () => {
    const { events, skippedChanges } = parseWebhookPayload(wrap({}, 1790000100));
    expect(skippedChanges).toBe(0);
    expect(onlyTemplate(events)).toEqual({
      kind: "template_status",
      wabaId: TEST_WABA_ID,
      eventTime: 1790000100,
      templateId: "300000000000003",
      templateName: "invoice_with_pdf",
      templateLanguage: "en_US",
      event: "APPROVED",
      knownEvent: true,
      reason: "NONE",
      category: "UTILITY",
    });
  });

  it("has no phoneNumberId (the payload has no metadata)", () => {
    const event = onlyTemplate(parseWebhookPayload(wrap({})).events);
    expect("phoneNumberId" in event).toBe(false);
    expect(event.eventTime).toBeUndefined();
  });

  it("maps a rejection with INVALID_FORMAT and rejection_info", () => {
    const event = onlyTemplate(
      parseWebhookPayload(
        wrap({
          event: "REJECTED",
          reason: "INVALID_FORMAT",
          rejection_info: {
            reason: "Adjacent parameters",
            recommendation: "Add text between them",
          },
        }),
      ).events,
    );
    expect(event.event).toBe("REJECTED");
    expect(event.reason).toBe("INVALID_FORMAT");
    expect(event.rejection).toEqual({
      reason: "Adjacent parameters",
      recommendation: "Add text between them",
    });
  });

  it("maps a rejection_info without a recommendation", () => {
    const event = onlyTemplate(
      parseWebhookPayload(
        wrap({ event: "REJECTED", reason: "INVALID_FORMAT", rejection_info: { reason: "Bad" } }),
      ).events,
    );
    expect(event.rejection).toEqual({ reason: "Bad" });
  });

  it("maps a disable with disable_info (integer or numeric-string date)", () => {
    const asNumber = onlyTemplate(
      parseWebhookPayload(wrap({ event: "DISABLED", disable_info: { disable_date: 1751234563 } }))
        .events,
    );
    expect(asNumber.disableDate).toBe(1751234563);
    const asString = onlyTemplate(
      parseWebhookPayload(wrap({ event: "DISABLED", disable_info: { disable_date: "1751234563" } }))
        .events,
    );
    expect(asString.disableDate).toBe(1751234563);
    const garbage = onlyTemplate(
      parseWebhookPayload(wrap({ event: "DISABLED", disable_info: { disable_date: "soon" } }))
        .events,
    );
    expect(garbage.disableDate).toBeUndefined();
  });

  it("maps a pause with other_info", () => {
    const event = onlyTemplate(
      parseWebhookPayload(
        wrap({
          event: "PAUSED",
          other_info: { title: "FIRST_PAUSE", description: "Paused for quality" },
        }),
      ).events,
    );
    expect(event.other).toEqual({ title: "FIRST_PAUSE", description: "Paused for quality" });
  });

  it("maps reason: null (scheduled for deletion) to null", () => {
    const event = onlyTemplate(
      parseWebhookPayload(wrap({ event: "PENDING_DELETION", reason: null })).events,
    );
    expect(event.reason).toBeNull();
  });

  it("treats an absent reason as null and an absent category as undefined", () => {
    const { events } = parseWebhookPayload({
      object: "whatsapp_business_account",
      entry: [
        {
          id: TEST_WABA_ID,
          changes: [
            {
              field: "message_template_status_update",
              value: {
                event: "DELETED",
                message_template_id: 1,
                message_template_name: "n",
                message_template_language: "en",
              },
            },
          ],
        },
      ],
    });
    const event = onlyTemplate(events);
    expect(event.reason).toBeNull();
    expect(event.category).toBeUndefined();
  });

  it("keeps ordering with message events in the same payload", () => {
    const { events } = parseWebhookPayload(
      envelope([messagesChange({ messages: [TEXT_MESSAGE] }), change({})]),
    );
    expect(events.map((e) => e.kind)).toEqual(["message", "template_status"]);
    expect(METADATA.phone_number_id).toBeDefined();
  });

  it("lists the documented event values (F-117)", () => {
    expect(TEMPLATE_STATUS_EVENTS).toEqual([
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
    ]);
  });

  it("throws WaValidationError for a malformed template change", () => {
    expect(() =>
      parseWebhookPayload(wrap({ message_template_id: undefined, message_template_name: 5 })),
    ).toThrow(WaValidationError);
  });
});

describe("unknown events and other fields (test 64)", () => {
  it("parses an unknown event with knownEvent: false", () => {
    const event = onlyTemplate(parseWebhookPayload(wrap({ event: "TELEPORTED" })).events);
    expect(event.event).toBe("TELEPORTED");
    expect(event.knownEvent).toBe(false);
  });

  it("still counts other unknown fields in skippedChanges", () => {
    const { events, skippedChanges } = parseWebhookPayload(
      envelope([
        { field: "group_lifecycle_update", value: {} },
        { field: "phone_number_quality_update", value: {} },
        change({}),
      ]),
    );
    expect(events).toHaveLength(1);
    expect(skippedChanges).toBe(2);
  });
});
