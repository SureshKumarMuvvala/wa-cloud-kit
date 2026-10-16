import { z } from "zod";
import { WaValidationError } from "./errors.js";

/** Default Graph API host (F-001). */
export const DEFAULT_BASE_URL = "https://graph.facebook.com"; // F-001

/**
 * Per-tenant client config. Nothing is stored; pass it on every client you
 * create.
 *
 * `graphApiVersion` is required and has no default [lib]: versions expire
 * (F-004) and an unversioned call silently uses the app-dashboard version
 * (F-005). Pin the version you have tested against.
 */
export const WaClientConfigSchema = z.object({
  /** Business phone number ID; a path segment (F-001). Digits only [lib]. */
  phoneNumberId: z.string().regex(/^\d+$/),
  /** Opaque access token (F-003). Never parsed, logged or put into errors. */
  accessToken: z.string().min(1),
  /** Graph API version such as `"v26.0"` (F-004, F-005). */
  graphApiVersion: z.string().regex(/^v\d+\.\d+$/),
  /** Graph API host (F-001). */
  baseUrl: z.url().default(DEFAULT_BASE_URL),
  /** Injected fetch; defaults to `globalThis.fetch`. */
  fetch: z
    .custom<typeof globalThis.fetch>((value) => typeof value === "function", {
      message: "Expected a fetch function",
    })
    .optional(),
});
export type WaClientConfig = z.input<typeof WaClientConfigSchema>;

/** A validated config. Internal. */
export type ResolvedConfig = z.output<typeof WaClientConfigSchema>;

/** Validates a config; throws {@link WaValidationError}. Internal. */
export function resolveConfig(config: WaClientConfig): ResolvedConfig {
  const result = WaClientConfigSchema.safeParse(config);
  if (!result.success) {
    throw WaValidationError.fromZod("Invalid WhatsApp client config", result.error);
  }
  return result.data;
}
