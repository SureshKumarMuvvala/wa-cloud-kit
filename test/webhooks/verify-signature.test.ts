import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { WaValidationError, verifyWebhookSignature } from "../../src/index.js";
import { envelope, messagesChange, TEXT_MESSAGE } from "../fixtures/webhooks.js";
import { TEST_APP_SECRET } from "../helpers/ids.js";

const rawBody = JSON.stringify(envelope([messagesChange({ messages: [TEXT_MESSAGE] })]));

function sign(body: string | Uint8Array, secret = TEST_APP_SECRET): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

describe("verifyWebhookSignature (tests 26-29)", () => {
  it("accepts a known vector computed with node:crypto (string body)", async () => {
    await expect(
      verifyWebhookSignature({
        rawBody,
        signatureHeader: sign(rawBody),
        appSecret: TEST_APP_SECRET,
      }),
    ).resolves.toBe(true);
  });

  it("accepts a Uint8Array body", async () => {
    const bytes = new TextEncoder().encode(rawBody);
    await expect(
      verifyWebhookSignature({
        rawBody: bytes,
        signatureHeader: sign(bytes),
        appSecret: TEST_APP_SECRET,
      }),
    ).resolves.toBe(true);
  });

  it("verifies a non-ASCII body over its UTF-8 bytes", async () => {
    const body = '{"amount":"₹1,250"}';
    const header = sign(Buffer.from(body, "utf8"));
    await expect(
      verifyWebhookSignature({
        rawBody: body,
        signatureHeader: header,
        appSecret: TEST_APP_SECRET,
      }),
    ).resolves.toBe(true);
    await expect(
      verifyWebhookSignature({
        rawBody: new TextEncoder().encode(body),
        signatureHeader: header,
        appSecret: TEST_APP_SECRET,
      }),
    ).resolves.toBe(true);
  });

  const good = sign(rawBody);
  const digest = good.slice("sha256=".length);
  const changedByOneByte = rawBody.replace("invoice", "invoicE");

  it.each([
    ["a body changed by one byte", { rawBody: changedByOneByte, signatureHeader: good }],
    ["the wrong secret", { rawBody, signatureHeader: sign(rawBody, "other-secret") }],
    ["a missing header (undefined)", { rawBody, signatureHeader: undefined }],
    ["a missing header (null)", { rawBody, signatureHeader: null }],
    ["an empty header", { rawBody, signatureHeader: "" }],
    ["a sha1= prefix", { rawBody, signatureHeader: `sha1=${digest}` }],
    ["no prefix", { rawBody, signatureHeader: digest }],
    ["uppercase hex", { rawBody, signatureHeader: `sha256=${digest.toUpperCase()}` }],
    ["a 63-char digest", { rawBody, signatureHeader: `sha256=${digest.slice(0, 63)}` }],
    ["a 65-char digest", { rawBody, signatureHeader: `sha256=${digest}0` }],
    [
      "re-serialized JSON",
      { rawBody: JSON.stringify(JSON.parse(rawBody), null, 2), signatureHeader: good },
    ],
    ["a non-string, non-bytes body", { rawBody: 42 as never, signatureHeader: good }],
  ])("returns false for %s", async (_label, input) => {
    await expect(verifyWebhookSignature({ ...input, appSecret: TEST_APP_SECRET })).resolves.toBe(
      false,
    );
  });

  it("throws WaValidationError only for an empty app secret", async () => {
    await expect(
      verifyWebhookSignature({ rawBody, signatureHeader: good, appSecret: "" }),
    ).rejects.toBeInstanceOf(WaValidationError);
  });
});
