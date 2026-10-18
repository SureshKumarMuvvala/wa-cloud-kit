import { describe, expect, it } from "vitest";
import {
  WaResponseShapeError,
  WaValidationError,
  createWaBusinessClient,
  type SubscribeAppInput,
} from "../../src/index.js";
import { fakeFetch, jsonResponse, type FakeReply } from "../helpers/fake-fetch.js";
import {
  TEST_APP_ID,
  TEST_BUSINESS_TOKEN,
  TEST_VERIFY_TOKEN,
  TEST_WABA_ID,
} from "../helpers/ids.js";

const URL_BASE = `https://graph.facebook.com/v25.0/${TEST_WABA_ID}/subscribed_apps`;

function setup(replies: readonly FakeReply[]) {
  const fake = fakeFetch(replies);
  const client = createWaBusinessClient({
    wabaId: TEST_WABA_ID,
    accessToken: TEST_BUSINESS_TOKEN,
    graphApiVersion: "v25.0",
    fetch: fake.fetch,
  });
  return { fake, client };
}

describe("subscribeApp (test 90, F-207, D-44)", () => {
  it("POSTs with no body and no Content-Type", async () => {
    const { fake, client } = setup([jsonResponse({ success: true })]);
    const result = await client.subscribeApp();
    const call = fake.calls[0];
    expect(call?.method).toBe("POST");
    expect(call?.url).toBe(URL_BASE);
    expect(call?.body).toBeUndefined();
    expect(call?.headers).not.toHaveProperty("content-type");
    expect(call?.headers.authorization).toBe(`Bearer ${TEST_BUSINESS_TOKEN}`);
    expect(result.success).toBe(true);
  });

  it("sends override_callback_uri and verify_token together", async () => {
    const { fake, client } = setup([jsonResponse({ success: true })]);
    await client.subscribeApp({
      override: { callbackUri: "https://hooks.example.test/wa/t1", verifyToken: TEST_VERIFY_TOKEN },
    });
    expect(JSON.parse(String(fake.calls[0]?.body))).toEqual({
      override_callback_uri: "https://hooks.example.test/wa/t1",
      verify_token: TEST_VERIFY_TOKEN,
    });
  });

  const longUri = `https://hooks.example.test/${"a".repeat(201 - "https://hooks.example.test/".length)}`;
  it.each<[string, unknown]>([
    [
      "http URI",
      { override: { callbackUri: "http://hooks.example.test/x", verifyToken: TEST_VERIFY_TOKEN } },
    ],
    ["201-character URI", { override: { callbackUri: longUri, verifyToken: TEST_VERIFY_TOKEN } }],
    ["URI without verify token", { override: { callbackUri: "https://hooks.example.test/x" } }],
    ["verify token without URI", { override: { verifyToken: TEST_VERIFY_TOKEN } }],
    ["unknown key", { other: true }],
  ])("rejects %s with no request", async (_label, input) => {
    const { fake, client } = setup([]);
    await expect(client.subscribeApp(input as SubscribeAppInput)).rejects.toThrow(
      WaValidationError,
    );
    expect(fake.calls).toEqual([]);
  });

  it("accepts a 200-character URI", async () => {
    const { client } = setup([jsonResponse({ success: true })]);
    const uri = longUri.slice(0, 200);
    expect(uri).toHaveLength(200);
    await expect(
      client.subscribeApp({ override: { callbackUri: uri, verifyToken: TEST_VERIFY_TOKEN } }),
    ).resolves.toMatchObject({ success: true });
  });

  it("missing success → WaResponseShapeError", async () => {
    const { client } = setup([jsonResponse({ data: [] })]);
    await expect(client.subscribeApp()).rejects.toThrow(WaResponseShapeError);
  });
});

describe("listSubscribedApps and unsubscribeApp (test 90, F-207, D-45)", () => {
  it("maps the documented GET shape", async () => {
    const { fake, client } = setup([
      jsonResponse({
        data: [
          {
            whatsapp_business_api_data: {
              id: TEST_APP_ID,
              name: "Example SaaS",
              link: "https://app.example.test",
            },
            override_callback_uri: "https://hooks.example.test/wa/t1",
          },
          { whatsapp_business_api_data: { id: "500000000000006" } },
        ],
      }),
    ]);
    const result = await client.listSubscribedApps();
    expect(fake.calls[0]?.method).toBe("GET");
    expect(fake.calls[0]?.url).toBe(URL_BASE);
    expect(result.apps).toEqual([
      {
        id: TEST_APP_ID,
        name: "Example SaaS",
        link: "https://app.example.test",
        overrideCallbackUri: "https://hooks.example.test/wa/t1",
      },
      { id: "500000000000006" },
    ]);
  });

  it("unsubscribeApp sends DELETE", async () => {
    const { fake, client } = setup([jsonResponse({ success: true })]);
    await expect(client.unsubscribeApp()).resolves.toMatchObject({ success: true });
    expect(fake.calls[0]?.method).toBe("DELETE");
    expect(fake.calls[0]?.url).toBe(URL_BASE);
    expect(fake.calls[0]?.body).toBeUndefined();
  });
});
