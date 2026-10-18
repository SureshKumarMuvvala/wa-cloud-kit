import { describe, expect, it } from "vitest";
import {
  WaApiError,
  WaResponseShapeError,
  WaValidationError,
  exchangeEmbeddedSignupCode,
} from "../../src/index.js";
import { fakeFetch, jsonResponse, type FakeReply } from "../helpers/fake-fetch.js";
import { TEST_APP_ID, TEST_APP_SECRET, TEST_BUSINESS_TOKEN, TEST_ES_CODE } from "../helpers/ids.js";

function app(replies: readonly FakeReply[]) {
  const fake = fakeFetch(replies);
  return {
    fake,
    config: {
      appId: TEST_APP_ID,
      appSecret: TEST_APP_SECRET,
      graphApiVersion: "v25.0",
      fetch: fake.fetch,
    },
  };
}

async function catchError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the promise to reject");
}

describe("exchangeEmbeddedSignupCode request (test 87, F-203)", () => {
  it("sends the documented GET with no Authorization header", async () => {
    const { fake, config } = app([
      jsonResponse({
        access_token: TEST_BUSINESS_TOKEN,
        token_type: "bearer",
        expires_in: 5184000,
      }),
    ]);
    const result = await exchangeEmbeddedSignupCode(config, { code: TEST_ES_CODE });
    expect(fake.calls).toHaveLength(1);
    const call = fake.calls[0];
    expect(call?.method).toBe("GET");
    expect(call?.url).toBe(
      `https://graph.facebook.com/v25.0/oauth/access_token?client_id=${TEST_APP_ID}&client_secret=${TEST_APP_SECRET}&code=${TEST_ES_CODE}`,
    );
    expect(call?.headers).not.toHaveProperty("authorization");
    expect(call?.body).toBeUndefined();
    expect(result).toEqual({
      accessToken: TEST_BUSINESS_TOKEN,
      tokenType: "bearer",
      expiresIn: 5184000,
    });
  });

  it("sends redirect_uri only when given (C-15)", async () => {
    const { fake, config } = app([jsonResponse({ access_token: TEST_BUSINESS_TOKEN })]);
    const result = await exchangeEmbeddedSignupCode(config, {
      code: TEST_ES_CODE,
      redirectUri: "https://app.example.test/signup",
    });
    expect(new URL(fake.calls[0]?.url ?? "").searchParams.get("redirect_uri")).toBe(
      "https://app.example.test/signup",
    );
    expect(result).toEqual({ accessToken: TEST_BUSINESS_TOKEN });
  });

  it("validates input and config before any request", async () => {
    const { fake, config } = app([]);
    await expect(exchangeEmbeddedSignupCode(config, { code: "" })).rejects.toThrow(
      WaValidationError,
    );
    await expect(
      exchangeEmbeddedSignupCode(config, { code: TEST_ES_CODE, redirectUri: "not a url" }),
    ).rejects.toThrow(WaValidationError);
    await expect(
      exchangeEmbeddedSignupCode({ ...config, appSecret: "" }, { code: TEST_ES_CODE }),
    ).rejects.toThrow(WaValidationError);
    await expect(
      exchangeEmbeddedSignupCode({ ...config, appId: "abc" }, { code: TEST_ES_CODE }),
    ).rejects.toThrow(WaValidationError);
    expect(fake.calls).toEqual([]);
  });

  it("maps a Graph error envelope to WaApiError", async () => {
    const { config } = app([
      jsonResponse({ error: { message: "Invalid code", type: "OAuthException", code: 100 } }, 400),
    ]);
    const error = await catchError(exchangeEmbeddedSignupCode(config, { code: TEST_ES_CODE }));
    expect(error).toBeInstanceOf(WaApiError);
  });
});

describe("exchangeEmbeddedSignupCode response forms (test 88, C-14, D-35)", () => {
  it("accepts a bare token body", async () => {
    const { config } = app([new Response(TEST_BUSINESS_TOKEN, { status: 200 })]);
    expect(await exchangeEmbeddedSignupCode(config, { code: TEST_ES_CODE })).toEqual({
      accessToken: TEST_BUSINESS_TOKEN,
    });
  });

  it.each([
    ["spaces", `${TEST_BUSINESS_TOKEN} extra`],
    ["several lines", `${TEST_BUSINESS_TOKEN}\nsecond`],
    ["empty", ""],
    ["JSON without access_token", JSON.stringify({ token: TEST_BUSINESS_TOKEN })],
  ])("rejects %s without echoing the body", async (_label, body) => {
    const { config } = app([new Response(body, { status: 200 })]);
    const error = await catchError(exchangeEmbeddedSignupCode(config, { code: TEST_ES_CODE }));
    expect(error).toBeInstanceOf(WaResponseShapeError);
    const text = [
      String(error),
      JSON.stringify(error),
      JSON.stringify(Object.values(error as object)),
    ].join(" ");
    expect(text).not.toContain(TEST_BUSINESS_TOKEN);
    expect(text).not.toContain(TEST_APP_SECRET);
    expect(text).not.toContain(TEST_ES_CODE);
  });
});
