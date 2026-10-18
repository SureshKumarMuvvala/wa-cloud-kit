import { describe, expect, it } from "vitest";
import { WaApiError, WaValidationError, createWaClient } from "../../src/index.js";
import { fakeFetch, jsonResponse, type FakeReply } from "../helpers/fake-fetch.js";
import { TEST_BUSINESS_TOKEN, TEST_PHONE_NUMBER_ID, TEST_PIN } from "../helpers/ids.js";

function setup(replies: readonly FakeReply[]) {
  const fake = fakeFetch(replies);
  const client = createWaClient({
    phoneNumberId: TEST_PHONE_NUMBER_ID,
    accessToken: TEST_BUSINESS_TOKEN,
    graphApiVersion: "v25.0",
    fetch: fake.fetch,
  });
  return { fake, client };
}

describe("registerPhoneNumber (test 91, F-208)", () => {
  it("POSTs exactly {messaging_product, pin} to /register", async () => {
    const { fake, client } = setup([jsonResponse({ success: true })]);
    const result = await client.registerPhoneNumber({ pin: TEST_PIN });
    const call = fake.calls[0];
    expect(call?.method).toBe("POST");
    expect(call?.url).toBe(`https://graph.facebook.com/v25.0/${TEST_PHONE_NUMBER_ID}/register`);
    expect(JSON.parse(String(call?.body))).toEqual({
      messaging_product: "whatsapp",
      pin: TEST_PIN,
    });
    expect(call?.headers.authorization).toBe(`Bearer ${TEST_BUSINESS_TOKEN}`);
    expect(result.success).toBe(true);
  });

  it.each(["12345", "1234567", "12a456", ""])("rejects PIN %j with no request", async (pin) => {
    const { fake, client } = setup([]);
    await expect(client.registerPhoneNumber({ pin })).rejects.toThrow(WaValidationError);
    expect(fake.calls).toEqual([]);
  });

  it("maps 133016 (rate limit) to category throttling (F-209)", async () => {
    const { client } = setup([
      jsonResponse({ error: { message: "(#133016) Too many attempts", code: 133016 } }, 400),
    ]);
    await expect(client.registerPhoneNumber({ pin: TEST_PIN })).rejects.toMatchObject({
      name: "WaApiError",
      category: "throttling",
    });
  });

  it("surfaces 133005 (wrong PIN) as WaApiError (F-211)", async () => {
    const { client } = setup([
      jsonResponse(
        { error: { message: "(#133005) Two step verification PIN Mismatch", code: 133005 } },
        400,
      ),
    ]);
    await expect(client.registerPhoneNumber({ pin: TEST_PIN })).rejects.toBeInstanceOf(WaApiError);
  });
});

describe("setTwoStepPin (test 91, F-212)", () => {
  it("POSTs {pin} to the phone number node", async () => {
    const { fake, client } = setup([jsonResponse({ success: true })]);
    await expect(client.setTwoStepPin({ pin: TEST_PIN })).resolves.toMatchObject({ success: true });
    expect(fake.calls[0]?.url).toBe(`https://graph.facebook.com/v25.0/${TEST_PHONE_NUMBER_ID}`);
    expect(JSON.parse(String(fake.calls[0]?.body))).toEqual({ pin: TEST_PIN });
  });

  it("rejects a 5-digit PIN with no request", async () => {
    const { fake, client } = setup([]);
    await expect(client.setTwoStepPin({ pin: "12345" })).rejects.toThrow(WaValidationError);
    expect(fake.calls).toEqual([]);
  });
});
