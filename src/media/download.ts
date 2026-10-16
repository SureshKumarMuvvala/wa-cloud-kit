import { z } from "zod";
import type { TransportConfig } from "../config.js";
import { WaTransportError, WaValidationError } from "../errors.js";
import { WaHttpError } from "../errors.js";
import { toHttpFailure } from "../transport.js";

/**
 * The only media host shown in Meta's docs (F-133). It appears for the webhook
 * `url` field only; the host of `GET /{media-id}` URLs is not documented
 * (G-16), so a URL on any other host fails closed unless the caller opts in
 * with `allowedMediaHosts`.
 */
export const DEFAULT_MEDIA_HOSTS = ["lookaside.fbsbx.com"] as const; // F-133, G-16

const DEFAULT_MAX_BYTES = 100_000_000; // F-063 (decimal MB, G-8)
const MAX_REDIRECTS = 3; // [lib]

/**
 * Download input (F-132). The `Authorization` header is sent only to an https
 * URL whose hostname exactly equals one of `allowedMediaHosts` (D-8): no
 * wildcards, suffix matching, credentials in the URL, or ports other than 443.
 * Every redirect hop is checked the same way.
 */
export const DownloadMediaInputSchema = z.strictObject({
  url: z.url(),
  allowedMediaHosts: z
    .array(z.string().regex(/^[a-z0-9.-]+$/))
    .min(1)
    .optional(),
  maxBytes: z.int().positive().optional(),
});
export type DownloadMediaInput = z.input<typeof DownloadMediaInputSchema>;

export interface DownloadMediaResult {
  body: Blob;
  /** The response `content-type` header (F-132), or null if absent. */
  contentType: string | null;
  size: number;
}

function refuse(message: string, path: (string | number)[], input: unknown): WaValidationError {
  return new WaValidationError(message, [{ code: "custom", message, path, input }]);
}

/**
 * Throws `WaValidationError` unless `target` may receive the token (D-8).
 * The message names the hostname only: never the query string or token.
 */
function assertTokenSafe(target: string, allowed: readonly string[]): URL {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    throw refuse("Media URL is not a valid URL", ["url"], "");
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:") {
    throw refuse(`Media URL must use https (host ${host}); the token was not sent`, ["url"], host);
  }
  if (url.username !== "" || url.password !== "") {
    throw refuse(
      `Media URL must not contain credentials (host ${host}); the token was not sent`,
      ["url"],
      host,
    );
  }
  if (url.port !== "" && url.port !== "443") {
    throw refuse(
      `Media URL must use port 443 (host ${host}); the token was not sent`,
      ["url"],
      host,
    );
  }
  if (!allowed.includes(host)) {
    throw refuse(
      `Media host "${host}" is not in allowedMediaHosts; the token was not sent`,
      ["url"],
      host,
    );
  }
  return url;
}

function tooLarge(maxBytes: number): WaValidationError {
  return refuse(`media larger than maxBytes (${String(maxBytes)})`, ["maxBytes"], maxBytes);
}

async function readCapped(response: Response, maxBytes: number): Promise<Uint8Array[]> {
  const declared = response.headers.get("content-length");
  if (declared !== null && /^\d+$/.test(declared) && Number(declared) > maxBytes) {
    await response.body?.cancel();
    throw tooLarge(maxBytes);
  }
  const chunks: Uint8Array[] = [];
  if (response.body === null) {
    return chunks;
  }
  const reader = response.body.getReader();
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      return chunks;
    }
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw tooLarge(maxBytes);
    }
    chunks.push(value);
  }
}

/**
 * GETs a media URL with the token (F-132). Internal.
 *
 * The caller has validated `input`. Redirects are followed by hand, at most 3
 * hops, and only to targets that pass the same checks [lib]. A non-2xx answer
 * raises `WaApiError` (Graph envelope) or `WaHttpError`; for `404` Meta's
 * advice is to fetch a **new** media URL and retry, then renew the token
 * (F-132). The library does not retry.
 */
export async function downloadMediaFile(
  config: TransportConfig,
  input: z.output<typeof DownloadMediaInputSchema>,
  signal?: AbortSignal,
): Promise<DownloadMediaResult> {
  const allowed = input.allowedMediaHosts ?? DEFAULT_MEDIA_HOSTS;
  const maxBytes = input.maxBytes ?? DEFAULT_MAX_BYTES;
  const fetchImpl = config.fetch ?? globalThis.fetch;

  let current = assertTokenSafe(input.url, allowed);
  for (let hop = 0; ; hop += 1) {
    const init: RequestInit = {
      method: "GET",
      headers: { Authorization: `Bearer ${config.accessToken}` }, // F-002
      redirect: "manual",
    };
    if (signal !== undefined) {
      init.signal = signal;
    }

    let response: Response;
    try {
      response = await fetchImpl(current.href, init);
    } catch (cause) {
      throw new WaTransportError("Request to the WhatsApp Cloud API failed", { cause });
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (location === null) {
        throw new WaHttpError({ httpStatus: response.status, bodyText: "" });
      }
      if (hop >= MAX_REDIRECTS) {
        throw refuse(
          `Media download redirected more than ${String(MAX_REDIRECTS)} times`,
          ["url"],
          "",
        );
      }
      let target: string;
      try {
        target = new URL(location, current).href;
      } catch {
        throw refuse("Media redirect target is not a valid URL", ["url"], "");
      }
      current = assertTokenSafe(target, allowed);
      continue;
    }

    if (!response.ok) {
      let text: string;
      try {
        text = await response.text();
      } catch (cause) {
        throw new WaTransportError("Request to the WhatsApp Cloud API failed", { cause });
      }
      throw toHttpFailure(response.status, text);
    }

    const contentType = response.headers.get("content-type");
    let chunks: Uint8Array[];
    try {
      chunks = await readCapped(response, maxBytes);
    } catch (cause) {
      if (cause instanceof WaValidationError) {
        throw cause;
      }
      throw new WaTransportError("Request to the WhatsApp Cloud API failed", { cause });
    }
    const body = new Blob(chunks as BlobPart[], contentType === null ? {} : { type: contentType });
    return { body, contentType, size: body.size };
  }
}
