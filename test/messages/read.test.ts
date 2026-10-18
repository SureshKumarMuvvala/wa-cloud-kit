import { describe, expect, it } from "vitest";
import { WaValidationError, buildMarkAsReadPayload, createWaClient } from "../../src/index.js";
import { fakeFetch, jsonResponse, type FakeReply } from "../helpers/fake-fetch.js";
import { TEST_PHONE_NUMBER_ID, TEST_TOKEN } from "../helpers/ids.js";

function setup(replies: readonly FakeReply[]) {
  const fake = fakeFetch(replies);
  const client = createWaClient({
    phoneNumberId: TEST_PHONE_NUMBER_ID,
    accessToken: TEST_TOKEN,
    graphApiVersion: "v25.0",
    fetch: fake.fetch,
  });
  return { fake, client };
}

describe("markAsRead (test 95, F-234, F-235)", () => {
  it("sends exactly {messaging_product, status, message_id}", async () => {
    const { fake, client } = setup([jsonResponse({ success: true })]);
    const result = await client.markAsRead({ messageId: "wamid.in-1" });
    expect(fake.calls[0]?.url).toBe(
      `https://graph.facebook.com/v25.0/${TEST_PHONE_NUMBER_ID}/messages`,
    );
    expect(JSON.parse(String(fake.calls[0]?.body))).toEqual({
      messaging_product: "whatsapp",
      status: "read",
      message_id: "wamid.in-1",
    });
    expect(result).toEqual({ success: true, raw: { success: true } });
  });

  it("adds typing_indicator only when typingIndicator is true", () => {
    expect(buildMarkAsReadPayload({ messageId: "wamid.in-1", typingIndicator: true })).toEqual({
      messaging_product: "whatsapp",
      status: "read",
      message_id: "wamid.in-1",
      typing_indicator: { type: "text" },
    });
    expect(
      buildMarkAsReadPayload({ messageId: "wamid.in-1", typingIndicator: false }),
    ).not.toHaveProperty("typing_indicator");
  });

  it("maps 131009 to category parameter", async () => {
    const { client } = setup([
      jsonResponse(
        { error: { message: "(#131009) Parameter value is not valid", code: 131009 } },
        400,
      ),
    ]);
    await expect(client.markAsRead({ messageId: "wamid.bad" })).rejects.toMatchObject({
      name: "WaApiError",
      category: "parameter",
    });
  });

  it("rejects an empty id with no request", async () => {
    const { fake, client } = setup([]);
    await expect(client.markAsRead({ messageId: "" })).rejects.toThrow(WaValidationError);
    expect(fake.calls).toEqual([]);
  });
});
