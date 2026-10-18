import type { z } from "zod";
import type { TransportConfig } from "./config.js";
import {
  GraphErrorEnvelopeSchema,
  WaApiError,
  WaHttpError,
  WaResponseShapeError,
  WaTransportError,
} from "./errors.js";

/** Query values; `undefined` entries are skipped. */
export type QueryParams = Readonly<Record<string, string | number | undefined>>;

/**
 * One Graph API call [lib]. `path` is everything after the version segment,
 * with no leading slash (for example `"<phone-number-id>/messages"`).
 *
 * - `json` sets `Content-Type: application/json` (F-001); `form` sends
 *   multipart and lets fetch add the boundary (F-060); with neither, no body
 *   and no `Content-Type` are sent.
 * - `parse` defaults to `"json"`; `"none"` ignores a 2xx body and validates
 *   `undefined` against the schema (pass `z.undefined()`); `"text"` validates
 *   the raw 2xx body string and never copies it into an error (v0.3 §1.2).
 * - `auth` defaults to `"bearer"`; `"none"` sends no `Authorization` header
 *   (the Embedded Signup code exchange, F-203).
 *
 * Errors never carry the request URL, its query or the request body (v0.3
 * §1.2): the code-exchange URL holds the app secret and the code, and the
 * register body holds the PIN.
 */
export interface RequestSpec {
  method: "GET" | "POST" | "DELETE";
  path: string;
  query?: QueryParams;
  json?: unknown;
  form?: FormData;
  parse?: "json" | "none" | "text";
  auth?: "bearer" | "none";
}

/** `baseUrl/version/path[?query]`, shared by the JSON transport and the media download. */
export function buildGraphUrl(config: TransportConfig, path: string, query?: QueryParams): string {
  const base = config.baseUrl.replace(/\/+$/, "");
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      params.append(key, String(value));
    }
  }
  const search = params.toString();
  return `${base}/${config.graphApiVersion}/${path}${search === "" ? "" : `?${search}`}`;
}

function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

/**
 * Maps a non-2xx response body to {@link WaApiError} (Graph envelope, F-070)
 * or {@link WaHttpError}. Internal.
 */
export function toHttpFailure(httpStatus: number, text: string): WaApiError | WaHttpError {
  const parsed = tryParseJson(text);
  if (parsed.ok) {
    const envelope = GraphErrorEnvelopeSchema.safeParse(parsed.value);
    if (envelope.success) {
      return new WaApiError({ httpStatus, envelope: envelope.data });
    }
  }
  return new WaHttpError({ httpStatus, bodyText: text });
}

/**
 * Sends one request to the Graph API through the injected fetch and maps the
 * result. Internal.
 *
 * - `fetch` throws → {@link WaTransportError}
 * - non-2xx with the Graph envelope (F-070) → {@link WaApiError}
 * - other non-2xx → {@link WaHttpError}
 * - 2xx failing `schema` → {@link WaResponseShapeError}
 *
 * The access token is only ever placed in the `Authorization` header (F-002).
 */
export async function request<S extends z.ZodType>(
  config: TransportConfig,
  spec: RequestSpec,
  schema: S,
  signal?: AbortSignal,
): Promise<z.output<S>> {
  const fetchImpl = config.fetch ?? globalThis.fetch;
  const headers = new Headers();
  if (spec.auth !== "none") {
    headers.set("Authorization", `Bearer ${config.accessToken}`); // F-002
  }
  const init: RequestInit = { method: spec.method, headers };
  if ("json" in spec) {
    headers.set("Content-Type", "application/json"); // F-001
    init.body = JSON.stringify(spec.json);
  } else if (spec.form !== undefined) {
    init.body = spec.form; // fetch sets the multipart boundary (F-060)
  }
  if (signal !== undefined) {
    init.signal = signal;
  }

  let text: string;
  let response: Response;
  try {
    response = await fetchImpl(buildGraphUrl(config, spec.path, spec.query), init);
    text = await response.text();
  } catch (cause) {
    throw new WaTransportError("Request to the WhatsApp Cloud API failed", { cause });
  }

  if (!response.ok) {
    throw toHttpFailure(response.status, text);
  }

  let value: unknown;
  if (spec.parse === "none") {
    value = undefined;
  } else if (spec.parse === "text") {
    const result = schema.safeParse(text);
    if (!result.success) {
      // The body may be a secret (a bare token, C-14): keep it out of the error.
      throw new WaResponseShapeError({
        issues: [{ code: "custom", message: "Response body has an unexpected shape", path: [] }],
        raw: undefined,
      });
    }
    return result.data;
  } else {
    const parsed = tryParseJson(text);
    if (!parsed.ok) {
      throw new WaResponseShapeError({
        issues: [
          { code: "custom", message: "Response body is not valid JSON", path: [], input: text },
        ],
        raw: text,
      });
    }
    value = parsed.value;
  }
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new WaResponseShapeError({ issues: result.error.issues, raw: value });
  }
  return result.data;
}
