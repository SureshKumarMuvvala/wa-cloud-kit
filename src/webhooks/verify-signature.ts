import { WaValidationError } from "../errors.js";
import { constantTimeEqual } from "./constant-time.js";

const SIGNATURE_HEADER = /^sha256=([0-9a-f]{64})$/; // F-082

export interface VerifyWebhookSignatureInput {
  /** Exact bytes received. NOT re-serialized JSON: re-serializing changes the bytes. */
  rawBody: string | Uint8Array;
  /** Value of the `X-Hub-Signature-256` header (F-082). */
  signatureHeader: string | null | undefined;
  appSecret: string;
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Verifies `X-Hub-Signature-256: sha256=<hex>` (F-082): an HMAC-SHA256 of the
 * raw body bytes (a string is UTF-8 encoded), keyed with the app secret, via
 * `globalThis.crypto.subtle` [lib]. Digests are compared in constant time
 * (G-4).
 *
 * Returns `false` for any bad input and never throws, except
 * `WaValidationError` when `appSecret` is empty [lib].
 */
export async function verifyWebhookSignature(input: VerifyWebhookSignatureInput): Promise<boolean> {
  if (input.appSecret.length === 0) {
    throw new WaValidationError("appSecret must not be empty", [
      { code: "custom", message: "appSecret must not be empty", path: ["appSecret"], input: "" },
    ]);
  }
  const match =
    typeof input.signatureHeader === "string" ? SIGNATURE_HEADER.exec(input.signatureHeader) : null;
  const expectedHex = match?.[1];
  if (expectedHex === undefined) {
    return false;
  }
  const body: unknown = input.rawBody;
  let bytes: Uint8Array<ArrayBuffer>;
  if (typeof body === "string") {
    bytes = new TextEncoder().encode(body);
  } else if (body instanceof Uint8Array) {
    bytes = new Uint8Array(body);
  } else {
    return false;
  }
  try {
    const key = await globalThis.crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(input.appSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const actual = new Uint8Array(await globalThis.crypto.subtle.sign("HMAC", key, bytes));
    return constantTimeEqual(actual, hexToBytes(expectedHex));
  } catch {
    return false;
  }
}
