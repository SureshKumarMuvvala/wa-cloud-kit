import type { z } from "zod";
import type { ResolvedConfig } from "./config.js";
import {
  GraphErrorEnvelopeSchema,
  WaApiError,
  WaHttpError,
  WaResponseShapeError,
  WaTransportError,
} from "./errors.js";

/** Phone-number edges used by v0.1 (F-001, F-060). */
export type PhoneNumberEdge = "messages" | "media";

export type RequestBody =
  { path: PhoneNumberEdge; json: unknown } | { path: PhoneNumberEdge; form: FormData };

function buildUrl(config: ResolvedConfig, path: PhoneNumberEdge): string {
  const base = config.baseUrl.replace(/\/+$/, "");
  return `${base}/${config.graphApiVersion}/${config.phoneNumberId}/${path}`;
}

function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

/**
 * Sends one POST to the Graph API through the injected fetch and maps the
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
  config: ResolvedConfig,
  body: RequestBody,
  schema: S,
  signal?: AbortSignal,
): Promise<z.output<S>> {
  const fetchImpl = config.fetch ?? globalThis.fetch;
  const headers = new Headers({ Authorization: `Bearer ${config.accessToken}` }); // F-002
  let payload: string | FormData;
  if ("json" in body) {
    headers.set("Content-Type", "application/json"); // F-001
    payload = JSON.stringify(body.json);
  } else {
    payload = body.form; // fetch sets the multipart boundary (F-060)
  }

  const init: RequestInit = { method: "POST", headers, body: payload };
  if (signal !== undefined) {
    init.signal = signal;
  }

  let text: string;
  let response: Response;
  try {
    response = await fetchImpl(buildUrl(config, body.path), init);
    text = await response.text();
  } catch (cause) {
    throw new WaTransportError("Request to the WhatsApp Cloud API failed", { cause });
  }

  const parsed = tryParseJson(text);
  if (!response.ok) {
    if (parsed.ok) {
      const envelope = GraphErrorEnvelopeSchema.safeParse(parsed.value);
      if (envelope.success) {
        throw new WaApiError({ httpStatus: response.status, envelope: envelope.data });
      }
    }
    throw new WaHttpError({ httpStatus: response.status, bodyText: text });
  }

  if (!parsed.ok) {
    throw new WaResponseShapeError({
      issues: [
        { code: "custom", message: "Response body is not valid JSON", path: [], input: text },
      ],
      raw: text,
    });
  }
  const result = schema.safeParse(parsed.value);
  if (!result.success) {
    throw new WaResponseShapeError({ issues: result.error.issues, raw: parsed.value });
  }
  return result.data;
}
