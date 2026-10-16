import { describe, expect, it } from "vitest";
import {
  KNOWN_MESSAGE_STATUSES,
  WaValidationError,
  parseWebhookPayload,
  type WaWebhookEvent,
} from "../../src/index.js";
import {
  BUTTON_MESSAGE,
  CONTACT,
  DOCUMENT_MESSAGE,
  IMAGE_MESSAGE,
  STATUS_FAILED,
  STATUS_SENT,
  TEXT_MESSAGE,
  UNSUPPORTED_MESSAGE,
  VALUE_ERROR,
  envelope,
  messagesChange,
  status,
} from "../fixtures/webhooks.js";
import {
  TEST_DISPLAY_PHONE_NUMBER,
  TEST_PHONE_NUMBER_ID,
  TEST_RECIPIENT_WA_ID,
  TEST_WABA_ID,
} from "../helpers/ids.js";

const BASE = {
  wabaId: TEST_WABA_ID,
  phoneNumberId: TEST_PHONE_NUMBER_ID,
  displayPhoneNumber: TEST_DISPLAY_PHONE_NUMBER,
};

function only(events: WaWebhookEvent[]): WaWebhookEvent {
  expect(events).toHaveLength(1);
  const [event] = events;
  if (event === undefined) throw new Error("no event");
  return event;
}

function parseMessage(message: unknown) {
  return parseWebhookPayload(
    envelope([messagesChange({ contacts: [CONTACT], messages: [message] })]),
  );
}

describe("parseWebhookPayload: messages (tests 30-31)", () => {
  it("maps a text message with contact and metadata", () => {
    const parsed = parseMessage(TEXT_MESSAGE);
    expect(parsed.skippedChanges).toBe(0);
    expect(only(parsed.events)).toStrictEqual({
      ...BASE,
      kind: "message",
      contact: { name: "Test User", waId: TEST_RECIPIENT_WA_ID },
      message: TEXT_MESSAGE,
    });
  });

  it("maps a document message (F-088)", () => {
    const event = only(parseMessage(DOCUMENT_MESSAGE).events);
    expect(event).toMatchObject({ ...BASE, kind: "message", message: DOCUMENT_MESSAGE });
  });

  it("maps an image message without url (F-088)", () => {
    const event = only(parseMessage(IMAGE_MESSAGE).events);
    expect(event).toMatchObject({ kind: "message", message: IMAGE_MESSAGE });
    if (event.kind === "message" && event.message.type === "image") {
      expect(event.message.image.url).toBeUndefined();
    }
  });

  it("maps a button message with context (F-089)", () => {
    const event = only(parseMessage(BUTTON_MESSAGE).events);
    expect(event).toMatchObject({ kind: "message", message: BUTTON_MESSAGE });
    if (event.kind !== "message" || event.message.type !== "button") throw new Error("type");
    expect(event.message.button).toStrictEqual({ payload: "Pay now", text: "Pay now" });
    expect(event.message.context).toStrictEqual({ from: "15550000000", id: "wamid.TESTTEMPLATE" });
  });

  it("categorizes errors on an unsupported message (131051 → parameter)", () => {
    const event = only(parseMessage(UNSUPPORTED_MESSAGE).events);
    if (event.kind !== "message" || event.message.type !== "unsupported") throw new Error("type");
    expect(event.message.unsupported).toStrictEqual({ type: "edit" });
    expect(event.message.errors).toStrictEqual([
      { ...UNSUPPORTED_MESSAGE.errors[0], category: "parameter" },
    ]);
  });

  it("omits contact when contacts[] is absent", () => {
    const event = only(
      parseWebhookPayload(envelope([messagesChange({ messages: [TEXT_MESSAGE] })])).events,
    );
    expect(event).not.toHaveProperty("contact");
  });

  it("picks the contact whose wa_id matches the sender", () => {
    const other = { profile: { name: "Someone Else" }, wa_id: "15550000009" };
    const event = only(
      parseWebhookPayload(
        envelope([messagesChange({ contacts: [other, CONTACT], messages: [TEXT_MESSAGE] })]),
      ).events,
    );
    expect(event).toMatchObject({ contact: { name: "Test User", waId: TEST_RECIPIENT_WA_ID } });
  });

  it("tolerates unknown fields everywhere", () => {
    const payload = {
      object: "whatsapp_business_account",
      future_top: 1,
      entry: [
        {
          id: TEST_WABA_ID,
          future_entry: true,
          changes: [
            {
              field: "messages",
              future_change: "x",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  ...{
                    display_phone_number: TEST_DISPLAY_PHONE_NUMBER,
                    phone_number_id: TEST_PHONE_NUMBER_ID,
                  },
                  extra: 1,
                },
                contacts: [{ ...CONTACT, profile: { name: "Test User", extra: 2 } }],
                messages: [{ ...TEXT_MESSAGE, text: { body: "hi", extra: 3 }, extra: 4 }],
              },
            },
          ],
        },
      ],
    };
    const event = only(parseWebhookPayload(payload).events);
    expect(event).toMatchObject({
      kind: "message",
      message: { type: "text", text: { body: "hi" } },
    });
  });

  it("rejects a known message type that is missing its required fields", () => {
    expect(() => parseMessage({ ...TEXT_MESSAGE, text: {} })).toThrow(WaValidationError);
  });
});

describe("parseWebhookPayload: statuses (test 32)", () => {
  it("parses sent (with pricing and conversation) as known", () => {
    const event = only(
      parseWebhookPayload(envelope([messagesChange({ statuses: [STATUS_SENT] })])).events,
    );
    expect(event).toStrictEqual({
      ...BASE,
      kind: "status",
      status: { ...STATUS_SENT, known: true },
    });
  });

  it("parses failed with categorized errors", () => {
    const event = only(
      parseWebhookPayload(envelope([messagesChange({ statuses: [STATUS_FAILED] })])).events,
    );
    if (event.kind !== "status") throw new Error("kind");
    expect(event.status.known).toBe(true);
    expect(event.status.status).toBe("failed");
    expect(event.status.errors).toStrictEqual([
      { ...STATUS_FAILED.errors[0], category: "service_window_closed" },
    ]);
  });

  it.each(["sent", "delivered", "read", "failed", "played"])("parses %s as known", (value) => {
    const event = only(
      parseWebhookPayload(envelope([messagesChange({ statuses: [status(value)] })])).events,
    );
    expect(event).toMatchObject({ kind: "status", status: { status: value, known: true } });
  });

  it("lists exactly the F-091 statuses", () => {
    expect([...KNOWN_MESSAGE_STATUSES]).toEqual(["sent", "delivered", "read", "failed", "played"]);
  });

  it("passes an unrecognised status through with known: false and no error event (D-1)", () => {
    const parsed = parseWebhookPayload(
      envelope([messagesChange({ statuses: [status("deleted_future_value")] })]),
    );
    expect(parsed.events).toStrictEqual([
      {
        ...BASE,
        kind: "status",
        status: { ...status("deleted_future_value"), known: false },
      },
    ]);
  });
});

describe("parseWebhookPayload: errors, other, skipped (tests 33-35)", () => {
  it("emits kind:error events for value.errors (F-086)", () => {
    const event = only(
      parseWebhookPayload(envelope([messagesChange({ errors: [VALUE_ERROR] })])).events,
    );
    expect(event).toStrictEqual({
      ...BASE,
      kind: "error",
      error: { ...VALUE_ERROR, category: "throttling" },
    });
  });

  it("maps an unknown message type to other with originalType and raw", () => {
    const reaction = {
      from: TEST_RECIPIENT_WA_ID,
      id: "wamid.TESTREACTION",
      timestamp: "1790000010",
      type: "reaction",
      reaction: { message_id: "wamid.TESTOUT1", emoji: "👍" },
    };
    const event = only(parseMessage(reaction).events);
    expect(event).toMatchObject({
      kind: "message",
      message: {
        type: "other",
        originalType: "reaction",
        from: TEST_RECIPIENT_WA_ID,
        id: "wamid.TESTREACTION",
        timestamp: "1790000010",
        raw: reaction,
      },
    });
  });

  it("skips non-messages changes and counts them", () => {
    const parsed = parseWebhookPayload(
      envelope([
        { field: "group_lifecycle_update", value: { anything: true } },
        messagesChange({ messages: [TEXT_MESSAGE] }),
        { field: "some_future_field", value: {} },
      ]),
    );
    expect(parsed.skippedChanges).toBe(2);
    expect(parsed.events).toHaveLength(1);
  });

  it.each([
    ["wrong object", { object: "page", entry: [] }],
    ["missing object", { entry: [] }],
    ["null", null],
    ["a string", "{}"],
    ["missing entry", { object: "whatsapp_business_account" }],
  ])("throws WaValidationError for %s", (_label, body) => {
    expect(() => parseWebhookPayload(body)).toThrow(WaValidationError);
  });

  it("throws for a messages change without metadata", () => {
    expect(() =>
      parseWebhookPayload(envelope([{ field: "messages", value: { messages: [TEXT_MESSAGE] } }])),
    ).toThrow(WaValidationError);
  });
});

describe("parseWebhookPayload: batches (test 36)", () => {
  it("flattens multi-entry, multi-change batches in order", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: TEST_WABA_ID,
          changes: [
            messagesChange({
              contacts: [CONTACT],
              messages: [TEXT_MESSAGE, DOCUMENT_MESSAGE],
              statuses: [STATUS_SENT],
              errors: [VALUE_ERROR],
            }),
            { field: "group_settings_update", value: {} },
            messagesChange({
              statuses: [status("delivered", "wamid.A"), status("read", "wamid.B")],
            }),
          ],
        },
        {
          id: "200000000000003",
          changes: [messagesChange({ contacts: [CONTACT], messages: [IMAGE_MESSAGE] })],
        },
      ],
    };
    const parsed = parseWebhookPayload(payload);
    expect(parsed.skippedChanges).toBe(1);
    expect(
      parsed.events.map((e) => {
        switch (e.kind) {
          case "message":
            return `${e.wabaId}:message:${e.message.id}`;
          case "status":
            return `${e.wabaId}:status:${e.status.id}:${e.status.status}`;
          case "error":
            return `${e.wabaId}:error:${String(e.error.code)}`;
        }
      }),
    ).toEqual([
      "200000000000002:message:wamid.TESTTEXT",
      "200000000000002:message:wamid.TESTDOC",
      "200000000000002:status:wamid.TESTOUT1:sent",
      "200000000000002:error:130429",
      "200000000000002:status:wamid.A:delivered",
      "200000000000002:status:wamid.B:read",
      "200000000000003:message:wamid.TESTIMG",
    ]);
  });
});
