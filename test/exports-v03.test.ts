import { describe, expect, it } from "vitest";
import * as api from "../src/index.js";

// Test 96: the v0.3 public API is named exports only (no default export).
describe("v0.3 exports (test 96)", () => {
  it("exposes the new functions by name and no default export", () => {
    for (const name of [
      "createWebhookRouter",
      "webhookDedupeKey",
      "reduceMessageStatus",
      "parseEmbeddedSignupEvent",
      "exchangeEmbeddedSignupCode",
      "findPhoneNumber",
      "buildReplyButtonsMessage",
      "buildListMessage",
      "buildMarkAsReadPayload",
    ] as const) {
      expect(typeof api[name]).toBe("function");
    }
    expect(Object.keys(api)).not.toContain("default");
  });
});
