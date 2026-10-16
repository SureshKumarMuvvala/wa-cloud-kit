import { describe, expect, it } from "vitest";
import { WaValidationError, buildTextMessage } from "../../src/index.js";
import { sentJson, testClient } from "../helpers/client.js";
import { TEST_RECIPIENT } from "../helpers/ids.js";

describe("text messages (tests 6-8)", () => {
  it("builds the §3.2 payload without preview_url when unset", () => {
    expect(buildTextMessage({ to: TEST_RECIPIENT, body: "Hello" })).toStrictEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: TEST_RECIPIENT,
      type: "text",
      text: { body: "Hello" },
    });
  });

  it.each([true, false])("emits preview_url when set to %s", (previewUrl) => {
    const payload = buildTextMessage({
      to: TEST_RECIPIENT,
      body: "https://example.com",
      previewUrl,
    });
    expect(payload.text).toStrictEqual({ body: "https://example.com", preview_url: previewUrl });
  });

  it("matches the snapshot", () => {
    expect(
      buildTextMessage({ to: TEST_RECIPIENT, body: "Your invoice is ready", previewUrl: false }),
    ).toMatchInlineSnapshot(`
      {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "text": {
          "body": "Your invoice is ready",
          "preview_url": false,
        },
        "to": "+15550000001",
        "type": "text",
      }
    `);
  });

  it("accepts a 4096-character body", async () => {
    const { client, fake } = testClient();
    await client.sendText({ to: TEST_RECIPIENT, body: "a".repeat(4096) });
    expect(fake.calls).toHaveLength(1);
  });

  it.each([
    ["4097 characters", "a".repeat(4097)],
    ["empty", ""],
  ])("rejects a body of %s without calling fetch", async (_label, body) => {
    const { client, fake } = testClient();
    await expect(client.sendText({ to: TEST_RECIPIENT, body })).rejects.toBeInstanceOf(
      WaValidationError,
    );
    expect(fake.calls).toHaveLength(0);
  });

  it("rejects an empty recipient and unknown keys", () => {
    expect(() => buildTextMessage({ to: "", body: "x" })).toThrow(WaValidationError);
    expect(() => buildTextMessage({ to: TEST_RECIPIENT, body: "x", extra: 1 } as never)).toThrow(
      WaValidationError,
    );
  });

  it("passes `to` through unchanged", () => {
    expect(buildTextMessage({ to: "15550000001", body: "x" }).to).toBe("15550000001");
  });

  it("maps replyToMessageId to context.message_id", async () => {
    const { client, fake } = testClient();
    await client.sendText({ to: TEST_RECIPIENT, body: "Re", replyToMessageId: "wamid.TESTREPLY" });
    expect(sentJson(fake)).toMatchObject({ context: { message_id: "wamid.TESTREPLY" } });
  });

  it("omits context when not replying", () => {
    expect(buildTextMessage({ to: TEST_RECIPIENT, body: "x" })).not.toHaveProperty("context");
  });
});
