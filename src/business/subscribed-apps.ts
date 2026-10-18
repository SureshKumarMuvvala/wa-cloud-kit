import { z } from "zod";

/**
 * Subscribe input (F-207, D-44). `override` sets a per-WABA callback URL:
 * `https`, at most 200 characters, with its verify token (F-161). Template and
 * account webhooks still go to the app default (F-161).
 */
export const SubscribeAppInputSchema = z
  .strictObject({
    override: z
      .strictObject({
        callbackUri: z.url({ protocol: /^https$/ }).max(200), // F-161
        verifyToken: z.string().min(1),
      })
      .optional(),
  })
  .optional();
export type SubscribeAppInput = z.input<typeof SubscribeAppInputSchema>;

/** POST/DELETE response (F-207). `success` is required [lib]. */
export const SubscriptionResponseSchema = z.looseObject({
  success: z.boolean(),
  data: z.array(z.looseObject({})).optional(),
});
export type SubscriptionResponse = z.output<typeof SubscriptionResponseSchema>;

export interface SubscriptionResult {
  success: boolean;
  raw: SubscriptionResponse;
}

/** GET response (F-207). */
export const SubscribedAppsResponseSchema = z.looseObject({
  data: z.array(
    z.looseObject({
      whatsapp_business_api_data: z.looseObject({
        id: z.string(),
        name: z.string().optional(),
        link: z.string().optional(),
      }),
      override_callback_uri: z.string().optional(),
    }),
  ),
});
export type SubscribedAppsResponse = z.output<typeof SubscribedAppsResponseSchema>;

export interface WaSubscribedApp {
  id: string;
  name?: string;
  link?: string;
  overrideCallbackUri?: string;
}

export interface ListSubscribedAppsResult {
  apps: WaSubscribedApp[];
  raw: SubscribedAppsResponse;
}

export function toListSubscribedAppsResult(raw: SubscribedAppsResponse): ListSubscribedAppsResult {
  return {
    apps: raw.data.map((entry) => {
      const app = entry.whatsapp_business_api_data;
      return {
        id: app.id,
        ...(app.name === undefined ? {} : { name: app.name }),
        ...(app.link === undefined ? {} : { link: app.link }),
        ...(entry.override_callback_uri === undefined
          ? {}
          : { overrideCallbackUri: entry.override_callback_uri }),
      };
    }),
    raw,
  };
}
