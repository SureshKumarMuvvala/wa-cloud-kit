import { describe, expect, it } from "vitest";
import {
  ListMessagePayloadSchema,
  ReplyButtonsPayloadSchema,
  WaValidationError,
  buildListMessage,
  buildReplyButtonsMessage,
  createWaClient,
  type SendListInput,
  type SendReplyButtonsInput,
} from "../../src/index.js";
import { fakeFetch, jsonResponse } from "../helpers/fake-fetch.js";
import { TEST_MEDIA_ID, TEST_PHONE_NUMBER_ID, TEST_RECIPIENT, TEST_TOKEN } from "../helpers/ids.js";

const SEND_OK = {
  messaging_product: "whatsapp",
  contacts: [{ input: TEST_RECIPIENT, wa_id: "15550000001" }],
  messages: [{ id: "wamid.test-1" }],
};

const BUTTONS: SendReplyButtonsInput = {
  to: TEST_RECIPIENT,
  body: "Invoice INV-0001 is ready. Do you want the PDF here?",
  footer: "Example Traders",
  buttons: [
    { id: "send-pdf", title: "Send PDF" },
    { id: "later", title: "Later" },
  ],
};

function rejects(fn: () => unknown): void {
  expect(fn).toThrow(WaValidationError);
}

describe("reply buttons (test 93, F-231)", () => {
  it("builds exactly the §4.1 wire body", () => {
    const payload = buildReplyButtonsMessage(BUTTONS);
    expect(payload).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: TEST_RECIPIENT,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: "Invoice INV-0001 is ready. Do you want the PDF here?" },
        footer: { text: "Example Traders" },
        action: {
          buttons: [
            { type: "reply", reply: { id: "send-pdf", title: "Send PDF" } },
            { type: "reply", reply: { id: "later", title: "Later" } },
          ],
        },
      },
    });
    expect(ReplyButtonsPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it.each<[string, NonNullable<SendReplyButtonsInput["header"]>]>([
    ["text", { type: "text", text: "Invoice" }],
    ["document", { type: "document", document: { id: TEST_MEDIA_ID } }],
    ["image", { type: "image", image: { link: "https://cdn.example.test/logo.png" } }],
    ["video", { type: "video", video: { id: TEST_MEDIA_ID } }],
  ])("passes a %s header through", (_label, header) => {
    expect(buildReplyButtonsMessage({ ...BUTTONS, header }).interactive.header).toEqual(header);
  });

  it("adds context for a reply", () => {
    expect(
      buildReplyButtonsMessage({ ...BUTTONS, replyToMessageId: "wamid.in-1" }).context,
    ).toEqual({
      message_id: "wamid.in-1",
    });
  });

  it("accepts 1 and 3 buttons and boundary lengths", () => {
    buildReplyButtonsMessage({ ...BUTTONS, buttons: [{ id: "a", title: "A" }] });
    buildReplyButtonsMessage({
      ...BUTTONS,
      body: "b".repeat(1024),
      footer: "f".repeat(60),
      buttons: [
        { id: "i".repeat(256), title: "t".repeat(20) },
        { id: "b", title: "B" },
        { id: "c", title: "C" },
      ],
    });
  });

  it("rejects counts, lengths and duplicates", () => {
    const four = ["a", "b", "c", "d"].map((x) => ({ id: x, title: x }));
    rejects(() => buildReplyButtonsMessage({ ...BUTTONS, buttons: [] }));
    rejects(() => buildReplyButtonsMessage({ ...BUTTONS, buttons: four }));
    rejects(() =>
      buildReplyButtonsMessage({ ...BUTTONS, buttons: [{ id: "i".repeat(257), title: "x" }] }),
    );
    rejects(() =>
      buildReplyButtonsMessage({ ...BUTTONS, buttons: [{ id: "x", title: "t".repeat(21) }] }),
    );
    rejects(() =>
      buildReplyButtonsMessage({
        ...BUTTONS,
        buttons: [
          { id: "x", title: "A" },
          { id: "x", title: "B" },
        ],
      }),
    );
    rejects(() =>
      buildReplyButtonsMessage({
        ...BUTTONS,
        buttons: [
          { id: "x", title: "A" },
          { id: "y", title: "A" },
        ],
      }),
    );
    rejects(() => buildReplyButtonsMessage({ ...BUTTONS, body: "b".repeat(1025) }));
    rejects(() => buildReplyButtonsMessage({ ...BUTTONS, footer: "f".repeat(61) }));
    rejects(() => buildReplyButtonsMessage({ ...BUTTONS, body: "" }));
  });

  it("sendReplyButtons POSTs to /messages and returns the message id", async () => {
    const fake = fakeFetch([jsonResponse(SEND_OK)]);
    const client = createWaClient({
      phoneNumberId: TEST_PHONE_NUMBER_ID,
      accessToken: TEST_TOKEN,
      graphApiVersion: "v25.0",
      fetch: fake.fetch,
    });
    const result = await client.sendReplyButtons(BUTTONS);
    expect(result.messageId).toBe("wamid.test-1");
    expect(fake.calls[0]?.url).toBe(
      `https://graph.facebook.com/v25.0/${TEST_PHONE_NUMBER_ID}/messages`,
    );
    expect(JSON.parse(String(fake.calls[0]?.body))).toEqual(buildReplyButtonsMessage(BUTTONS));
    await expect(client.sendReplyButtons({ ...BUTTONS, buttons: [] })).rejects.toThrow(
      WaValidationError,
    );
    expect(fake.calls).toHaveLength(1);
  });
});

const LIST: SendListInput = {
  to: TEST_RECIPIENT,
  header: "Pay invoice INV-0001",
  body: "How would you like to pay?",
  footer: "Example Traders",
  buttonText: "Payment options",
  sections: [
    {
      title: "Now",
      rows: [
        { id: "card", title: "Card", description: "Visa or Mastercard" },
        { id: "bank", title: "Bank transfer" },
      ],
    },
    { title: "Later", rows: [{ id: "remind", title: "Remind me" }] },
  ],
};

function rows(n: number, prefix = "r") {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${String(i)}`,
    title: `Row ${String(i)}`,
  }));
}

describe("list (test 94, F-232, D-41)", () => {
  it("builds exactly the wire body", () => {
    const payload = buildListMessage(LIST);
    expect(payload).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: TEST_RECIPIENT,
      type: "interactive",
      interactive: {
        type: "list",
        header: { type: "text", text: "Pay invoice INV-0001" },
        body: { text: "How would you like to pay?" },
        footer: { text: "Example Traders" },
        action: {
          button: "Payment options",
          sections: [
            {
              title: "Now",
              rows: [
                { id: "card", title: "Card", description: "Visa or Mastercard" },
                { id: "bank", title: "Bank transfer" },
              ],
            },
            { title: "Later", rows: [{ id: "remind", title: "Remind me" }] },
          ],
        },
      },
    });
    expect(ListMessagePayloadSchema.safeParse(payload).success).toBe(true);
  });

  it("accepts 10 sections × 1 row and boundary lengths", () => {
    buildListMessage({
      ...LIST,
      sections: Array.from({ length: 10 }, (_, i) => ({
        title: `S${String(i)}`,
        rows: rows(1, `s${String(i)}-`),
      })),
    });
    buildListMessage({
      ...LIST,
      header: "h".repeat(60),
      body: "b".repeat(4096),
      footer: "f".repeat(60),
      buttonText: "t".repeat(20),
      sections: [
        {
          title: "s".repeat(24),
          rows: [{ id: "i".repeat(200), title: "t".repeat(24), description: "d".repeat(72) }],
        },
      ],
    });
  });

  it("rejects counts, lengths, untitled sections and duplicate row ids", () => {
    const one = (row: Record<string, string>) => ({
      ...LIST,
      sections: [{ title: "S", rows: [row as { id: string; title: string }] }],
    });
    rejects(() =>
      buildListMessage({
        ...LIST,
        sections: [
          { title: "A", rows: rows(6, "a") },
          { title: "B", rows: rows(5, "b") },
        ],
      }),
    );
    rejects(() =>
      buildListMessage({
        ...LIST,
        sections: Array.from({ length: 11 }, (_, i) => ({
          title: `S${String(i)}`,
          rows: rows(1, `s${String(i)}-`),
        })),
      }),
    );
    rejects(() => buildListMessage({ ...LIST, sections: [] }));
    rejects(() => buildListMessage({ ...LIST, sections: [{ title: "S", rows: [] }] }));
    rejects(() =>
      buildListMessage({
        ...LIST,
        sections: [{ rows: rows(1) } as unknown as SendListInput["sections"][number]],
      }),
    );
    rejects(() =>
      buildListMessage({ ...LIST, sections: [{ title: "s".repeat(25), rows: rows(1) }] }),
    );
    rejects(() => buildListMessage(one({ id: "i".repeat(201), title: "x" })));
    rejects(() => buildListMessage(one({ id: "x", title: "t".repeat(25) })));
    rejects(() => buildListMessage(one({ id: "x", title: "y", description: "d".repeat(73) })));
    rejects(() => buildListMessage({ ...LIST, buttonText: "t".repeat(21) }));
    rejects(() => buildListMessage({ ...LIST, header: "h".repeat(61) }));
    rejects(() => buildListMessage({ ...LIST, body: "b".repeat(4097) }));
    rejects(() =>
      buildListMessage({
        ...LIST,
        sections: [
          { title: "A", rows: [{ id: "x", title: "1" }] },
          { title: "B", rows: [{ id: "x", title: "2" }] },
        ],
      }),
    );
  });

  it("sendList POSTs to /messages", async () => {
    const fake = fakeFetch([jsonResponse(SEND_OK)]);
    const client = createWaClient({
      phoneNumberId: TEST_PHONE_NUMBER_ID,
      accessToken: TEST_TOKEN,
      graphApiVersion: "v25.0",
      fetch: fake.fetch,
    });
    await expect(client.sendList(LIST)).resolves.toMatchObject({ messageId: "wamid.test-1" });
    expect(JSON.parse(String(fake.calls[0]?.body))).toEqual(buildListMessage(LIST));
  });
});
