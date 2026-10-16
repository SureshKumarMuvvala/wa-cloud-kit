import { describe, expect, it } from "vitest";
import { WaValidationError, verifyWebhookChallenge } from "../../src/index.js";
import { TEST_VERIFY_TOKEN } from "../helpers/ids.js";

const good = {
  "hub.mode": "subscribe",
  "hub.verify_token": TEST_VERIFY_TOKEN,
  "hub.challenge": "4826153907",
};

describe("verifyWebhookChallenge (tests 24-25)", () => {
  it("accepts URLSearchParams and returns the challenge string unchanged (C-2)", () => {
    const query = new URLSearchParams(good);
    expect(verifyWebhookChallenge(query, TEST_VERIFY_TOKEN)).toStrictEqual({
      ok: true,
      challenge: "4826153907",
    });
  });

  it("accepts a plain record", () => {
    expect(
      verifyWebhookChallenge({ ...good, "hub.challenge": "abc-XYZ_0" }, TEST_VERIFY_TOKEN),
    ).toStrictEqual({ ok: true, challenge: "abc-XYZ_0" });
  });

  it.each([
    ["mode", { ...good, "hub.mode": "unsubscribe" }],
    ["mode", { ...good, "hub.mode": undefined }],
    ["token", { ...good, "hub.verify_token": "wrong-token" }],
    ["token", { ...good, "hub.verify_token": `${TEST_VERIFY_TOKEN}x` }],
    ["token", { ...good, "hub.verify_token": undefined }],
    ["challenge", { ...good, "hub.challenge": "" }],
    ["challenge", { ...good, "hub.challenge": undefined }],
  ] as const)("returns reason %s", (reason, query) => {
    expect(verifyWebhookChallenge(query, TEST_VERIFY_TOKEN)).toStrictEqual({ ok: false, reason });
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) params.set(key, value);
    }
    expect(verifyWebhookChallenge(params, TEST_VERIFY_TOKEN)).toStrictEqual({ ok: false, reason });
  });

  it("throws WaValidationError for an empty configured verify token", () => {
    expect(() => verifyWebhookChallenge({ ...good, "hub.verify_token": "" }, "")).toThrow(
      WaValidationError,
    );
  });
});
