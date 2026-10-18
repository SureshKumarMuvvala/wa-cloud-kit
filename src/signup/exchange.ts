import { z } from "zod";
import type { RequestOptions } from "../client.js";
import { resolveAppConfig, type WaAppConfig } from "../config.js";
import { WaResponseShapeError } from "../errors.js";
import { parseInput } from "../messages/common.js";
import { request } from "../transport.js";

/** Exchange input (F-203). `redirectUri` is sent only when given (C-15, D-35). */
export const ExchangeCodeInputSchema = z.strictObject({
  /** `response.authResponse.code` from the browser; opaque; lives 30 seconds (F-202). */
  code: z.string().min(1),
  redirectUri: z.url().optional(),
});
export type ExchangeCodeInput = z.input<typeof ExchangeCodeInputSchema>;

/** The JSON form (F-203). */
const TokenJsonSchema = z.looseObject({
  access_token: z.string().min(1),
  token_type: z.string().optional(),
  expires_in: z.number().optional(),
});

/** The tenant's business token. Store it; the library keeps nothing (D-40). */
export interface WaBusinessTokenResult {
  /** Opaque (F-003). Never logged or put into an error by the library. */
  accessToken: string;
  tokenType?: string;
  /** Seconds, when Meta sends `expires_in`. Absence means "not stated", not "never" (C-16). */
  expiresIn?: number;
}

function shapeError(message: string): WaResponseShapeError {
  // Never include the body: it may hold the token (C-14).
  return new WaResponseShapeError({
    issues: [{ code: "custom", message, path: [] }],
    raw: undefined,
  });
}

/** JSON first; else a bare token on a single line without whitespace (C-14, D-35). */
function toTokenResult(body: string): WaBusinessTokenResult {
  let json: unknown;
  let isJson = true;
  try {
    json = JSON.parse(body) as unknown;
  } catch {
    isJson = false;
  }
  if (isJson) {
    const result = TokenJsonSchema.safeParse(json);
    if (!result.success) {
      throw shapeError("Token response JSON has no access_token");
    }
    const { access_token: accessToken, token_type: tokenType, expires_in: expiresIn } = result.data;
    return {
      accessToken,
      ...(tokenType === undefined ? {} : { tokenType }),
      ...(expiresIn === undefined ? {} : { expiresIn }),
    };
  }
  if (/^\S+$/.test(body)) {
    return { accessToken: body };
  }
  throw shapeError("Token response is neither JSON nor a single bare token");
}

/**
 * Exchanges the Embedded Signup code for the tenant's business token:
 * `GET /{v}/oauth/access_token?client_id&client_secret&code[&redirect_uri]`
 * with no `Authorization` header (F-203, v0.3 §3.2). One Graph call.
 *
 * - Call it **immediately**: the code lives 30 seconds (F-202); a retry after
 *   that cannot succeed. Never call it from the browser (F-202, F-203).
 * - The secret, code and token never appear in an error (v0.3 §1.2, §3.8).
 * - Errors: `WaApiError` / `WaHttpError` / `WaTransportError`; an unexpected
 *   2xx body → `WaResponseShapeError` without the body. The error for an
 *   expired or reused code is not documented (G-27).
 * - Business tokens "default to never expire" (F-204), but a configuration
 *   may set 60 days (C-16); treat error `190` as "re-onboard" (F-073, G-19).
 */
export async function exchangeEmbeddedSignupCode(
  app: WaAppConfig,
  input: ExchangeCodeInput,
  opts?: RequestOptions,
): Promise<WaBusinessTokenResult> {
  const resolved = resolveAppConfig(app);
  const parsed = parseInput(ExchangeCodeInputSchema, input, "Invalid code exchange");
  const body = await request(
    // Auth is in the query (F-203); no bearer token exists yet.
    { ...resolved, accessToken: "" },
    {
      method: "GET",
      path: "oauth/access_token",
      auth: "none",
      parse: "text",
      query: {
        client_id: resolved.appId,
        client_secret: resolved.appSecret,
        code: parsed.code,
        redirect_uri: parsed.redirectUri,
      },
    },
    z.string(),
    opts?.signal,
  );
  return toTokenResult(body.trim());
}
