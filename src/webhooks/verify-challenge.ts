import { WaValidationError } from "../errors.js";
import { constantTimeEqual } from "./constant-time.js";

export type WebhookChallengeQuery = URLSearchParams | Readonly<Record<string, string | undefined>>;

export type WebhookChallengeResult =
  { ok: true; challenge: string } | { ok: false; reason: "mode" | "token" | "challenge" };

function read(query: WebhookChallengeQuery, key: string): string | undefined {
  if (query instanceof URLSearchParams) {
    return query.get(key) ?? undefined;
  }
  return query[key];
}

/**
 * Checks the webhook verification GET (F-080, F-081).
 *
 * `ok` requires `hub.mode === "subscribe"` (F-081), `hub.verify_token` equal
 * to `verifyToken` (constant-time compare [lib]) and a non-empty
 * `hub.challenge`. On `ok`, respond `200` with `challenge` as the body;
 * otherwise respond with a 4xx (F-080). The challenge is returned exactly as
 * received, as a string (C-2).
 *
 * Throws `WaValidationError` if `verifyToken` is empty [lib].
 */
export function verifyWebhookChallenge(
  query: WebhookChallengeQuery,
  verifyToken: string,
): WebhookChallengeResult {
  if (verifyToken.length === 0) {
    throw new WaValidationError("verifyToken must not be empty", [
      {
        code: "custom",
        message: "verifyToken must not be empty",
        path: ["verifyToken"],
        input: "",
      },
    ]);
  }
  if (read(query, "hub.mode") !== "subscribe") {
    return { ok: false, reason: "mode" };
  }
  const token = read(query, "hub.verify_token");
  const encoder = new TextEncoder();
  if (
    token === undefined ||
    !constantTimeEqual(encoder.encode(token), encoder.encode(verifyToken))
  ) {
    return { ok: false, reason: "token" };
  }
  const challenge = read(query, "hub.challenge");
  if (challenge === undefined || challenge.length === 0) {
    return { ok: false, reason: "challenge" };
  }
  return { ok: true, challenge };
}
