import { describe, expect, it } from "vitest";
import { createWaClient, exchangeEmbeddedSignupCode } from "../src/index.js";
import { fakeFetch, jsonResponse, textResponse, type FakeReply } from "./helpers/fake-fetch.js";
import {
  TEST_APP_ID,
  TEST_APP_SECRET,
  TEST_BUSINESS_TOKEN,
  TEST_ES_CODE,
  TEST_PHONE_NUMBER_ID,
  TEST_PIN,
} from "./helpers/ids.js";

// Test 92 (v0.3 spec §1.2, §3.8): no secret, code, token, PIN or URL query
// in any error the v0.3 calls can produce.
const SECRETS = [TEST_APP_SECRET, TEST_ES_CODE, TEST_BUSINESS_TOKEN, TEST_PIN];
const QUERY_MARKERS = ["client_secret=", "client_id=", "code=", "oauth/access_token?"];

const FAILURES: [string, () => FakeReply][] = [
  [
    "Graph envelope",
    () =>
      jsonResponse(
        { error: { message: "(#100) Invalid parameter", code: 100, fbtrace_id: "t" } },
        400,
      ),
  ],
  ["HTML 500", () => textResponse("<html><body>Internal error</body></html>", 500)],
  ["network error", () => new Error("socket hang up")],
  ["unexpected 2xx", () => jsonResponse({ unexpected: true })],
];

function everythingIn(error: unknown): string {
  const parts = [String(error), JSON.stringify(error)];
  if (error instanceof Error) {
    parts.push(error.message);
    for (const key of Object.getOwnPropertyNames(error)) {
      const value: unknown = (error as unknown as Record<string, unknown>)[key];
      // JSON.stringify can return undefined at runtime (e.g. for a function).
      const json = JSON.stringify(value) as string | undefined;
      parts.push(key, typeof value === "string" ? value : `${String(value)} ${String(json)}`);
      if (value instanceof Error) parts.push(String(value), value.message);
    }
  }
  return parts.join("\n");
}

async function caught(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected a rejection");
}

function client(reply: FakeReply) {
  return createWaClient({
    phoneNumberId: TEST_PHONE_NUMBER_ID,
    accessToken: TEST_BUSINESS_TOKEN,
    graphApiVersion: "v25.0",
    fetch: fakeFetch([reply]).fetch,
  });
}

describe("secret hygiene in errors (test 92)", () => {
  it.each(FAILURES)("code exchange: %s", async (_label, reply) => {
    const app = {
      appId: TEST_APP_ID,
      appSecret: TEST_APP_SECRET,
      graphApiVersion: "v25.0",
      fetch: fakeFetch([reply()]).fetch,
    };
    const text = everythingIn(
      await caught(exchangeEmbeddedSignupCode(app, { code: TEST_ES_CODE })),
    );
    for (const value of [...SECRETS, ...QUERY_MARKERS]) expect(text).not.toContain(value);
  });

  it.each(FAILURES)("register: %s", async (_label, reply) => {
    const text = everythingIn(await caught(client(reply()).registerPhoneNumber({ pin: TEST_PIN })));
    for (const value of SECRETS) expect(text).not.toContain(value);
  });

  it.each(FAILURES)("two-step PIN: %s", async (_label, reply) => {
    const text = everythingIn(await caught(client(reply()).setTwoStepPin({ pin: TEST_PIN })));
    for (const value of SECRETS) expect(text).not.toContain(value);
  });

  it("validation errors do not echo a bad PIN", async () => {
    const text = everythingIn(
      await caught(client(jsonResponse({})).registerPhoneNumber({ pin: "98765x" })),
    );
    expect(text).not.toContain("98765x");
  });
});
