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

/**
 * Per-tenant config for WABA-scoped calls (template management). Meta
 * addresses templates by WABA ID and sending/media by phone number ID, so
 * v0.2 has two scopes (F-100). The token is the same one the tenant's
 * {@link WaClientConfig} uses.
 */
export const WaBusinessConfigSchema = z.object({
  /** WhatsApp Business Account ID; a path segment (F-100). Digits only [lib]. */
  wabaId: z.string().regex(/^\d+$/),
  /** Opaque access token (F-003). Never parsed, logged or put into errors. */
  accessToken: z.string().min(1),
  /** Graph API version such as `"v26.0"`; required, no default (F-004, F-005). */
  graphApiVersion: z.string().regex(/^v\d+\.\d+$/),
  /** Graph API host (F-100). */
  baseUrl: z.url().default(DEFAULT_BASE_URL),
  /** Injected fetch; defaults to `globalThis.fetch`. */
  fetch: z
    .custom<typeof globalThis.fetch>((value) => typeof value === "function", {
      message: "Expected a fetch function",
    })
    .optional(),
});
export type WaBusinessConfig = z.input<typeof WaBusinessConfigSchema>;

/** A validated WABA-scoped config. Internal. */
export type ResolvedBusinessConfig = z.output<typeof WaBusinessConfigSchema>;

/** What the transport needs from either scope. Internal. */
export interface TransportConfig {
  accessToken: string;
  graphApiVersion: string;
  baseUrl: string;
  fetch?: typeof globalThis.fetch | undefined;
}

/** Validates a WABA-scoped config; throws {@link WaValidationError}. Internal. */
export function resolveBusinessConfig(config: WaBusinessConfig): ResolvedBusinessConfig {
  const result = WaBusinessConfigSchema.safeParse(config);
  if (!result.success) {
    throw WaValidationError.fromZod("Invalid WhatsApp business config", result.error);
  }
  return result.data;
}

/** Validates a config; throws {@link WaValidationError}. Internal. */
export function resolveConfig(config: WaClientConfig): ResolvedConfig {
  const result = WaClientConfigSchema.safeParse(config);
  if (!result.success) {
    throw WaValidationError.fromZod("Invalid WhatsApp client config", result.error);
  }
  return result.data;
}
