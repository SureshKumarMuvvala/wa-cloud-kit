import { describe, expect, it } from "vitest";
import {
  WaBusinessConfigSchema,
  WaClientConfigSchema,
  WaValidationError,
  createWaBusinessClient,
  createWaClient,
} from "../src/index.js";
import { resolveConfig } from "../src/config.js";
import { TEST_PHONE_NUMBER_ID, TEST_TOKEN, TEST_WABA_ID } from "./helpers/ids.js";

const valid = {
  phoneNumberId: TEST_PHONE_NUMBER_ID,
  accessToken: TEST_TOKEN,
  graphApiVersion: "v25.0",
};

describe("WaClientConfig (test 1)", () => {
  it("accepts a valid config and defaults baseUrl", () => {
    const config = resolveConfig(valid);
    expect(config.baseUrl).toBe("https://graph.facebook.com");
    expect(config.graphApiVersion).toBe("v25.0");
  });

  it.each([
    ["empty phoneNumberId", { ...valid, phoneNumberId: "" }],
    ["non-digit phoneNumberId", { ...valid, phoneNumberId: "abc" }],
    ["empty accessToken", { ...valid, accessToken: "" }],
    ['graphApiVersion "25"', { ...valid, graphApiVersion: "25" }],
    ['graphApiVersion "v25"', { ...valid, graphApiVersion: "v25" }],
    ['graphApiVersion "latest"', { ...valid, graphApiVersion: "latest" }],
    ["invalid baseUrl", { ...valid, baseUrl: "not a url" }],
    ["non-function fetch", { ...valid, fetch: "nope" }],
  ])("rejects %s", (_label, config) => {
    expect(() => resolveConfig(config as never)).toThrow(WaValidationError);
    expect(() => createWaClient(config as never)).toThrow(WaValidationError);
  });

  it("exports the schema itself", () => {
    expect(WaClientConfigSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing graphApiVersion (no default)", () => {
    const rest = { phoneNumberId: valid.phoneNumberId, accessToken: valid.accessToken };
    expect(() => createWaClient(rest as never)).toThrow(WaValidationError);
  });

  it("never echoes the token in a config error", () => {
    const secret = "test-token";
    try {
      createWaClient({ ...valid, accessToken: secret, graphApiVersion: "latest" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(WaValidationError);
      expect(String(error)).not.toContain(secret);
      expect(JSON.stringify(error)).not.toContain(secret);
    }
  });
});

describe("WaBusinessConfig (v0.2 §1)", () => {
  const business = { wabaId: TEST_WABA_ID, accessToken: TEST_TOKEN, graphApiVersion: "v25.0" };

  it("accepts a valid config and defaults baseUrl", () => {
    const parsed = WaBusinessConfigSchema.parse(business);
    expect(parsed.baseUrl).toBe("https://graph.facebook.com");
  });

  it.each([
    ["empty wabaId", { ...business, wabaId: "" }],
    ["non-digit wabaId", { ...business, wabaId: "12/34" }],
    ["empty accessToken", { ...business, accessToken: "" }],
    ["missing graphApiVersion", { wabaId: TEST_WABA_ID, accessToken: TEST_TOKEN }],
    ['graphApiVersion "latest"', { ...business, graphApiVersion: "latest" }],
    ["bad baseUrl", { ...business, baseUrl: "not a url" }],
    ["non-function fetch", { ...business, fetch: "nope" }],
  ])("createWaBusinessClient rejects %s", (_label, config) => {
    expect(() => createWaBusinessClient(config as never)).toThrow(WaValidationError);
  });

  it("does not leak the token in a validation error", () => {
    try {
      createWaBusinessClient({ ...business, wabaId: "bad" });
      throw new Error("expected a throw");
    } catch (error) {
      expect((error as Error).message).not.toContain(TEST_TOKEN);
    }
  });
});
