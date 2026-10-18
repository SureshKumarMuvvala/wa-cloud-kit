# wa-cloud-kit — v0.3 specification

**Status:** Phase 1, spec only. No package code yet. Decisions D-30–D-45 (§12) are **proposals awaiting the maintainer**; conflicts C-13, C-14, C-15 and C-21 are open and block the parts of the code that depend on them.
**Builds on:** [`wa-cloud-kit.md`](wa-cloud-kit.md) (v0.1) and [`wa-cloud-kit-v0.2.md`](wa-cloud-kit-v0.2.md) (v0.2), both implemented. Their sections are cited as "v0.1 §n" and "v0.2 §n".
**Facts:** every Meta behaviour cites an ID in [`docs/facts.md`](../facts.md). New IDs in this spec: `F-170`–`F-178` (webhooks), `F-200`–`F-214` (Embedded Signup), `F-230`–`F-235` (interactive, read receipts), conflicts `C-13`–`C-22`, gaps `G-21`–`G-27`. All were retrieved on 2026-10-18. Every page already in `sources/` that this spec cites again was re-fetched the same day and its sha256 still matched the manifest. A behaviour without an ID is a library choice, labelled **[lib]**.

---

## 0. Purpose, scope, non-goals

v0.3 serves a multi-tenant SaaS in which every tenant (client business) connects its own WhatsApp number through Embedded Signup. The library stays **stateless**: it keeps no tenant table, no dedupe set and no tokens. Anything that needs memory — the tenant lookup, the idempotency store, the delivery state of a message — is passed in by the caller or returned to the caller (v0.1 §0, CLAUDE.md).

**In scope**
1. A webhook **router**: route each change to a tenant through a caller-supplied resolver; report unknown tenants explicitly; dedupe redeliveries through an injected idempotency store (§2).
2. A pure **status reducer** for `sent` / `delivered` / `read` / `played` / `failed` that tolerates any arrival order (§2.6).
3. Guidance for answering webhooks quickly (§2.7).
4. **Embedded Signup v4, server side**: parse what the browser sends, exchange the code, confirm the WABA and phone number, subscribe the app to the WABA, register the number, set the two-step PIN. One Graph call per function (§3).
5. **Messages**: interactive reply buttons, interactive lists, mark-as-read with optional typing indicator; parsing of the replies (§4).

**Non-goals (v0.3)**
- The browser side of Embedded Signup (Facebook JS SDK, `FB.login`, the message-event listener, origin checks). §3.1 documents only what the server receives from it.
- An onboarding orchestrator that runs all steps and remembers progress (D-37). Progress is caller state.
- `debug_token` (D-36), the Business Integration token-management API, Solution Partner credit-line sharing, phone number creation and OTP verification, pre-verified numbers, coexistence (WhatsApp Business app) onboarding, multi-partner solutions, migration.
- Interactive CTA URL, Flow, location-request, product, catalog, carousel and call-permission messages; group messages.
- Tracking the customer service window. The library has no clock and no store (§4.4).
- Retries, queues, timers, rate limiting, persistence, caching, any Meta SDK, any runtime dependency besides the `zod` peer.

---

## 1. Configuration and transport

### 1.1 Scopes

| Scope | Config | Used by |
|---|---|---|
| App (new) | `WaAppConfig` = `{ appId, appSecret, graphApiVersion, baseUrl?, fetch? }` | `exchangeEmbeddedSignupCode` (§3.2) only |
| WABA | `WaBusinessConfig` (v0.2 §1) with the tenant's **business token** | phone numbers, `subscribed_apps` (§3.3, §3.4) |
| Phone number | `WaClientConfig` (v0.1 §2) with the same business token | register, two-step PIN, sends, mark-as-read (§3.5, §3.6, §4) |

```ts
export const WaAppConfigSchema = z.object({
  appId: z.string().regex(/^\d+$/),                       // [lib] digits; shown as a number id (F-203)
  appSecret: z.string().min(1),                            // never logged, never in an error (§3.8)
  graphApiVersion: z.string().regex(/^v\d+\.\d+$/),        // required, no default (F-004, F-005)
  baseUrl: z.url().default("https://graph.facebook.com"),  // F-203
  fetch: z.custom<typeof globalThis.fetch>().optional(),
});
export type WaAppConfig = z.input<typeof WaAppConfigSchema>;
```

After onboarding the SaaS stores, per tenant, the business token, the WABA ID and the phone number ID, and builds the v0.1/v0.2 configs from them per request (v0.2 §7.1). The library never sees the store.

### 1.2 Transport changes [lib]

- `RequestSpec` (v0.2 §1) gains `auth: "bearer" | "none"` (default `"bearer"`). `"none"` sends no `Authorization` header; it is used only by the code exchange, which authenticates with `client_id`/`client_secret` in the query (F-203).
- **No URL in any error.** `WaTransportError`, `WaHttpError`, `WaApiError` and `WaResponseShapeError` never include the request URL, its query string or the request body. This was true in v0.2 by construction; v0.3 makes it a tested rule (test 92), because the code-exchange URL carries the app secret and the code, and the register body carries the PIN.
- No response body is copied into an error message for the code exchange (its body is the token; §3.2).

---

## 2. Webhook router

The v0.1 primitives stay as they are: `verifyWebhookChallenge`, `verifyWebhookSignature` (raw bytes only, F-082) and `parseWebhookPayload` (v0.1 §6). The router runs **after** signature verification and parsing, normally in the caller's background worker (§2.7).

### 2.1 Parser additions

`parseWebhookPayload` gains three things. Each is additive, but exhaustive `switch` statements over `kind` or `message.type` stop compiling, so v0.3 is a **minor** release under 0.x (§11, D-42).

**a) Interactive replies (F-178).**
```ts
export type WaInboundMessage =
  | /* v0.1/v0.2 variants */
  | { type: "interactive"; interactive:
        | { type: "button_reply"; button_reply: { id: string; title: string } }
        | { type: "list_reply";   list_reply:   { id: string; title: string; description?: string } } };
```
`context.{from, id}` is kept as in v0.1 (F-089, F-178); `context.id` is the business message that held the buttons or list. Any other `interactive.type` (Flow replies, etc.) becomes `{ type: "other" }`, as for unknown message types in v0.1 [lib].

**b) `account_update` (F-174, F-175, C-13).**
```ts
export type WaAccountUpdateEvent = {
  kind: "account_update";
  entryId: string;                 // entry[].id, exactly as received
  wabaId: string;                  // value.waba_info.waba_id if present, else entry[].id (D-32, C-13)
  eventTime?: number;              // entry[].time
  event: string;                   // e.g. PARTNER_ADDED, PARTNER_APP_UNINSTALLED; never rejected (D-9 spirit)
  ownerBusinessId?: string;        // waba_info.owner_business_id
  partnerAppId?: string;           // waba_info.partner_app_id (PARTNER_APP_* only)
  raw: Record<string, unknown>;    // the whole value, for fields v0.3 does not model
};
export const PARTNER_ACCOUNT_EVENTS = ["PARTNER_ADDED", "PARTNER_APP_INSTALLED",
  "PARTNER_APP_UNINSTALLED", "PARTNER_REMOVED", "PARTNER_CLIENT_CERTIFICATION_STATUS_UPDATE"] as const; // F-174
```
Like template events it has no `metadata`, so no `phoneNumberId` (F-174). `account_update` is an account-level field, so it always arrives at the app's default callback URL, never an override (F-161).

**c) Unhandled changes are listed, not only counted (D-33).**
```ts
export interface ParsedWebhook {
  events: WaWebhookEvent[];
  unhandled: WaUnhandledChange[];   // new
  skippedChanges: number;           // kept; always equals unhandled.length
}
export type WaUnhandledChange = {
  field: string; entryId: string; eventTime?: number;
  phoneNumberId?: string;           // value.metadata.phone_number_id when present
  value: unknown;                   // untouched
};
```

### 2.2 Routing keys

```ts
export type WaRoutingKey = {
  field: string;               // "messages", "message_template_status_update", "account_update", …
  wabaId: string;
  phoneNumberId?: string;      // present only for changes that carry value.metadata
  source: "metadata" | "entry" | "waba_info";
};
```

| Event | `phoneNumberId` | `wabaId` | Source |
|---|---|---|---|
| `message`, `status`, `error` (field `messages`) | `value.metadata.phone_number_id` | `entry[].id` | F-085 |
| `template_status` | — | `entry[].id` | F-117, F-161 (template events have no `metadata`) |
| `account_update` | — | `waba_info.waba_id`, else `entry[].id` | F-174, C-13, D-32 |
| unhandled change | `value.metadata.phone_number_id` if present | `entry[].id` | [lib] |

`source` records where `wabaId` came from, so a caller can audit routing [lib].

### 2.3 Resolver and result

```ts
export type WaTenantResolver<T> =
  (key: WaRoutingKey) => T | null | undefined | Promise<T | null | undefined>;

export function createWebhookRouter<T>(options: {
  resolveTenant: WaTenantResolver<T>;
  idempotency?: WaIdempotencyStore;        // §2.4; omitted → no dedupe, every event is routed
  dedupeTtlSeconds?: number;               // default 691_200 (8 days; D-31)
}): WaWebhookRouter<T>;

export interface WaWebhookRouter<T> {
  route(parsed: ParsedWebhook): Promise<WaRouteResult<T>>;
}

export type WaRouteResult<T> = {
  routed:     Array<{ tenant: T; key: WaRoutingKey; event: WaWebhookEvent; dedupeKey: string | null }>;
  duplicates: Array<{ tenant: T; key: WaRoutingKey; event: WaWebhookEvent; dedupeKey: string }>;
  unrouted:   Array<{ key: WaRoutingKey; item: WaWebhookEvent | WaUnhandledChange; reason: "unknown_tenant" }>;
  unhandled:  Array<{ tenant: T; key: WaRoutingKey; change: WaUnhandledChange }>;
};
```

**Rules [lib]:**
1. The resolver is called with the full key. It decides which part to trust (D-30). The README recommends: look up by `phoneNumberId` when present; otherwise by `wabaId`; and when both are present, check that the tenant found by phone owns that WABA, returning `null` on a mismatch.
2. Every event and every unhandled change lands in exactly one of `routed`, `duplicates`, `unrouted` or `unhandled`. Nothing is dropped. The counts add up to `events.length + unhandled.length` (test 71).
3. A resolver that returns `null` or `undefined` puts the item in `unrouted` with `reason: "unknown_tenant"`. Unrouted items are **not** claimed in the idempotency store, so a redelivery after the tenant is added is processed then (D-43).
4. The resolver is called at most once per distinct key within one `route()` call. The memo lives inside that call only; there is no module or router state.
5. All resolutions finish before any claim. A resolver that throws makes `route()` reject, and nothing has been claimed.
6. Payload order is kept within each list (v0.1 §6.3).
7. The router never throws on an unknown `field`, `event` or status string (D-1, D-9).

### 2.4 Duplicate delivery and the idempotency store

**What Meta says.** Failed deliveries (any status other than `200`, or undeliverable) are retried immediately, then with decreasing frequency for up to 7 days; "your server should handle deduplication" (F-083, F-170). Retries go to **every** app subscribed to the WABA, which can duplicate notifications (F-170). Batching is not guaranteed (F-083). The generic Graph page says 36 hours (C-1); the WhatsApp pages win. There is no API to fetch past webhooks (F-171). Which ids stay the same across a redelivery is not stated (G-26).

```ts
export interface WaIdempotencyStore {
  /** Atomically record `key` for `ttlSeconds` if it is absent. Resolve true if this call recorded it. */
  claim(key: string, ttlSeconds: number): Promise<boolean>;
  /** Optional. Forget `key`, so a later redelivery is processed again. */
  release?(key: string): Promise<void>;
}
export function webhookDedupeKey(event: WaWebhookEvent): string | null;   // pure; exported
```

**Keys (D-31, G-26) [lib]:**

| Event | Key | Why |
|---|---|---|
| message | `wa:msg:{phoneNumberId}:{message.id}` | message `id` (F-087) |
| status | `wa:st:{phoneNumberId}:{status.id}:{status.status}` | one webhook per status value (F-091, F-176) |
| template_status | `wa:tpl:{wabaId}:{templateId}:{event}:{eventTime ?? "-"}` | no unique id in the payload (v0.2 §5) |
| account_update | `wa:acct:{wabaId}:{event}:{eventTime ?? "-"}` | no unique id in the payload (F-174) |
| error (`value.errors`) | `null`: never deduped | no id at all (F-086, F-092) |
| unhandled change | `null` | unknown shape |

Key parts are taken verbatim from the payload; the `:` separator is safe because all parts are Meta ids or enum strings [lib]. The tenant is not part of the key, because the ids already carry the phone number or WABA.

**Flow [lib]:** for each resolved item with a non-null key, `claim(key, ttl)`. `true` → `routed`; `false` → `duplicates`. If `claim` rejects, the router calls `release` (when provided) on every key it claimed earlier in the same call, then rejects with the store's error. A key claimed by `route()` stays claimed after a later processing failure; the caller calls `release(dedupeKey)` if it wants Meta's (or its own) redelivery to be processed again.

**TTL (D-31):** default `691_200` s = the 7-day retry window (F-083, F-170) plus one day of margin [lib]. The caller may set any positive integer. Shorter values risk processing a late retry twice.

**Store requirements (README):** `claim` must be atomic across every process that handles this app's webhooks (for example `SET key 1 NX EX ttl` in Redis, or an `INSERT … ON CONFLICT DO NOTHING` with an expiry column). An in-memory map is fine only for tests and demos, as in v0.2 §6.1. If the SaaS runs several Meta apps against the same WABAs, each app receives its own copy (F-170); whether to dedupe across apps is the caller's choice (prefix the key).

### 2.5 Tenant routing for template and account events

Template status events carry only the WABA ID and always arrive at the app's default URL, even when a tenant has a `subscribed_apps` override (F-117, F-161). The same holds for `account_update` (F-161). A SaaS that gives each tenant its own callback URL for `messages` still needs the default URL to handle these two fields for all tenants, routed by WABA (§2.2).

### 2.6 Status reducer

A pure function over the delivery state of **one** sent message. The caller stores the state (for example in the invoice row) and passes it back.

```ts
export type WaDeliveryStatus = "sent" | "delivered" | "read" | "played" | "failed";
export type WaMessageDeliveryState = {
  messageId: string;
  current: WaDeliveryStatus;
  /** First-seen webhook timestamp (Unix seconds) per status. */
  seen: Partial<Record<WaDeliveryStatus, number>>;
  errors: WaWebhookError[];                     // from failed updates, unique by code
  pricing?: WaMessageStatus["pricing"];         // passed through (F-091)
  conversation?: WaMessageStatus["conversation"];
  anomalies: Array<"failed_after_positive" | "positive_after_failed">;
  unknownStatuses: string[];                    // D-1 values with known: false
};
export function reduceMessageStatus(
  state: WaMessageDeliveryState | undefined,
  update: WaMessageStatus,                      // a v0.1 `kind: "status"` event's `status`
): WaMessageDeliveryState;
```

**Order (D-34, G-22) [lib, derived from F-176].** Meta defines what each status means but not the order in which the webhooks arrive. From the meanings — sent "from our servers", delivered "to the WhatsApp user's device", read "displayed in an open chat thread", played "the first time a voice message is played" — the reducer ranks:

| Rank | Status |
|---|---|
| 1 | `sent` |
| 2 | `delivered` |
| 3 | `read` |
| 4 | `played` |
| — | `failed` (outside the ranking; see below) |

**Rules:**
1. `current` is the highest-ranked status seen. A lower-ranked update arriving later only fills `seen` (for example `delivered` arriving after `read` sets `seen.delivered` and leaves `current: "read"`).
2. **`failed`** ("failure to send or deliver", F-176). If no status of rank ≥ 2 has been seen, `current` becomes `failed` (it beats `sent`: the message left Meta's servers but did not arrive). If `delivered`, `read` or `played` has been seen, `current` keeps that status and `"failed_after_positive"` (or, when the failure was seen first, `"positive_after_failed"`) is added to `anomalies` (G-23). A positive status is evidence the message reached the device. Errors from every `failed` update are kept in `errors`.
3. Unknown status strings (`known: false`, D-1) are appended to `unknownStatuses` (no repeats) and change nothing else.
4. `seen[s]` keeps the **smallest** `timestamp` received for `s`. Timestamps are the webhook trigger time as a Unix string (F-091); a non-numeric value is ignored for `seen` but the status still counts [lib].
5. `pricing` and `conversation` are taken from the update with the greatest `(timestamp, rank)` that carries them; ties keep the existing value. They are passed through, not interpreted (F-091). `conversation.expiration_timestamp` exists only on `sent` (F-176), and `conversation` is omitted on v24.0+ except for free entry point windows (F-091).
6. **Order independence:** applying the same set of updates in any order gives a deep-equal state, and applying an update twice changes nothing (tests 76–77). This is what makes redeliveries and out-of-order webhooks safe even without the idempotency store.
7. `update.id !== state.messageId` → `WaValidationError` [lib]. The input state is never mutated.
8. Starting state: `reduceMessageStatus(undefined, u)` creates the state from `u`.

**Not decided by the reducer:** whether a message was dropped. JSDoc repeats Meta's rule: if no `delivered` arrives within the TTL (30 days for non-authentication messages), assume it was dropped; a `failed` can arrive after a minor delay (F-177). The SaaS applies that rule with its own clock.

### 2.7 Answering the webhook quickly (guidance; README and examples)

| Step | What | Source |
|---|---|---|
| 1 | Read the raw body bytes; cap at 3 MB | F-084 |
| 2 | `verifyWebhookSignature` over the raw bytes; reject a bad signature with a non-200 | F-082 |
| 3 | Persist the raw body (or the parsed payload) to a durable queue **before** answering. There is no API to fetch past webhooks | F-171 |
| 4 | Answer `200` | F-083 |
| 5 | In the worker: `parseWebhookPayload` → `router.route()` → handle `routed`; store or alert on `unrouted` | §2.1–§2.4 |
| 6 | Feed `status` events into `reduceMessageStatus` | §2.6 |

- **No timeout is documented** on the WhatsApp pages or the Graph Webhooks page (G-21). The library therefore states no number. The reason to answer fast is the documented retry policy: anything other than `200` (or a failed delivery) is retried for up to 7 days and duplicates the work (F-083, F-170).
- Answer `200` even when the router later finds no tenant: the payload is already persisted, and a non-200 only causes retries to every subscribed app (F-170).
- Answering `200` before processing means Meta will not redeliver if the worker fails; replay comes from the caller's own queue. The idempotency store makes that replay safe.

---

## 3. Embedded Signup v4 — server side

### 3.1 What the server receives from the browser (F-200–F-202)

The browser code (out of scope) receives two things and must send both to the SaaS server at once, because the code lives 30 seconds (F-202):
1. the **code**, `response.authResponse.code` from the `FB.login` callback (F-202);
2. the **session event** `data` of the `message` event with `type: 'WA_EMBEDDED_SIGNUP'` (F-200, F-201).

```ts
export function parseEmbeddedSignupEvent(input: unknown): WaEmbeddedSignupEvent;   // throws WaValidationError

export type WaEmbeddedSignupEvent =
  | { kind: "finish"; event: string;            // FINISH, FINISH_ONLY_WABA, … (F-200); unknown strings allowed
      wabaId: string; phoneNumberId?: string;   // phone absent for FINISH_ONLY_WABA (F-200)
      businessId?: string; wabaIds?: string[]; raw: Record<string, unknown> }
  | { kind: "cancel"; currentStep: string; raw: Record<string, unknown> }               // F-201
  | { kind: "error_report"; errorMessage: string; errorCode: string;
      sessionId: string; timestamp: string; raw: Record<string, unknown> }             // F-201
  | { kind: "flow_error"; raw: Record<string, unknown> };                               // event "ERROR" (F-200)
export const EMBEDDED_SIGNUP_FINISH_EVENTS = ["FINISH", "FINISH_ONLY_WABA",
  "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING", "FINISH_OBO_MIGRATION", "FINISH_GRANT_ONLY_API_ACCESS"] as const;
export const EMBEDDED_SIGNUP_CANCEL_STEPS = ["BUSINESS_ACCOUNT_SELECTION", "WABA_PHONE_PROFILE_PICKER",
  "WHATSAPP_BUSINESS_PROFILE_SETUP", "PHONE_NUMBER_SETUP", "PHONE_NUMBER_VERIFICATION", "PERMISSIONS"] as const;
```

**Rules (D-39):**
- `type` must equal `"WA_EMBEDDED_SIGNUP"`; otherwise `WaValidationError` (F-200).
- Loose schema: extra fields such as `version` (F-201) or asset id arrays are kept in `raw`.
- `event: "CANCEL"` with `data.current_step` → `cancel`; with `data.error_message` → `error_report` (F-201).
- Ids must be digit strings [lib], so a malformed id is caught before it reaches a URL path.
- **The event is untrusted input.** It came through the tenant user's browser. Its ids are confirmed server-side with the tenant's own business token before they are stored (§3.3, D-36).
- The code is not part of this schema; it is a separate, opaque, non-empty string.

### 3.2 Exchange the code — `GET /{v}/oauth/access_token` (F-203, F-202, C-14, C-15)

```ts
export function exchangeEmbeddedSignupCode(
  app: WaAppConfig,
  input: { code: string; redirectUri?: string },     // code: non-empty, opaque; redirectUri: absolute URL
  opts?: RequestOptions,
): Promise<WaBusinessTokenResult>;

export type WaBusinessTokenResult = {
  accessToken: string;          // the tenant's business token; opaque (F-003)
  tokenType?: string;           // from token_type when present
  expiresIn?: number;           // seconds, from expires_in when present; absence means "not stated", not "never"
};
```

- Query: `client_id`, `client_secret`, `code`, and `redirect_uri` only when `redirectUri` is given (C-15, D-35). `auth: "none"` (§1.2).
- **Response (C-14, D-35, proposed):** parse as JSON with `z.looseObject({ access_token: z.string().min(1), token_type: z.string().optional(), expires_in: z.number().optional() })` (the documented JSON form, F-203). If the 2xx body is not JSON, accept it as the token only if it is a single non-empty line without whitespace (the Tech Provider page's bare `<BUSINESS_TOKEN>`, F-203). Anything else → `WaResponseShapeError` whose message names the problem but **never** includes the body.
- Errors → `WaApiError` / `WaHttpError` as usual. The error for an expired or reused code is not documented (G-27); no special category.
- JSDoc: call this **immediately** on receiving the code (30-second TTL, F-202); a retry after that cannot succeed; never call it from the browser (F-202, F-203; es-onboarding "Do not use client-side requests").
- The secret, code and token never appear in an error, a log line or `raw` (§3.8, test 92). The result has no `raw` field [lib].

### 3.3 Confirm the WABA and phone number — `GET /{v}/{waba-id}/phone_numbers` (F-206, D-36)

Added to `WaBusinessClient` (v0.2 §1), created with the tenant's WABA ID and **business token**.

```ts
listPhoneNumbers(input?: {
  fields?: string[];                 // joined with ","; non-empty entries; empty array rejected
  limit?: number;                    // int 1–100 (F-206)
  after?: string; before?: string;   // cursors
}, opts?: RequestOptions): Promise<{
  phoneNumbers: WaPhoneNumber[]; nextCursor?: string; previousCursor?: string; raw: unknown;
}>;

WaPhoneNumberSchema = z.looseObject({
  id: z.string(),                                     // the only required field (C-18)
  display_phone_number: z.string().optional(),
  verified_name: z.string().optional(),
  status: z.string().optional(),                      // CONNECTED, PENDING, … (F-206); string, not enum (D-9)
  code_verification_status: z.string().optional(),    // EXPIRED | NOT_VERIFIED | VERIFIED (F-206)
  platform_type: z.string().optional(),               // CLOUD_API in the guide example (F-206)
});
```

- Paging as v0.2 §2.2: `nextCursor` from `paging.cursors.after` only when `paging.next` exists; `paging.next` is never fetched.
- **Confirmation recipe (README, D-36):** after the exchange, list the WABA's numbers with the new business token. If the call succeeds, the token can act on that WABA; if the event's `phoneNumberId` is in the list, the number belongs to it. Otherwise stop onboarding and show an error. A pure helper `findPhoneNumber(result, phoneNumberId)` returns the entry or `undefined`.
- Why not `debug_token` (F-205): it puts the business token in the URL query (`input_token`) and needs the partner's own System User token as a second secret (C-17). `phone_numbers` proves the same thing with the token in the `Authorization` header only (v0.1 §8). `debug_token` is documented in the README as the way to find the WABA if the session event was lost, but it is not wrapped.

### 3.4 Subscribe the app to the WABA — `/{v}/{waba-id}/subscribed_apps` (F-207, F-161, F-173)

On `WaBusinessClient`:

```ts
subscribeApp(input?: { override?: { callbackUri: string; verifyToken: string } }, opts?): Promise<{ success: boolean; raw: unknown }>;
listSubscribedApps(opts?): Promise<{ apps: Array<{ id: string; name?: string; link?: string; overrideCallbackUri?: string }>; raw: unknown }>;
unsubscribeApp(opts?): Promise<{ success: boolean; raw: unknown }>;
```

- `subscribeApp()` with no input sends `POST` with **no body** (the body is optional, F-207; the Tech Provider curl sends none, F-157).
- `override` (D-44) sends `{ override_callback_uri, verify_token }`. `callbackUri` must be an `https` URL of at most 200 characters (F-161); `verifyToken` non-empty. Both or neither [lib]. JSDoc: the override endpoint must answer the verification `GET` (F-080); template and account webhooks still go to the app default (F-161).
- Response `z.looseObject({ success: z.boolean(), data: z.array(z.looseObject({})).optional() })`; a missing `success` → `WaResponseShapeError` (F-207).
- `listSubscribedApps` maps `data[].whatsapp_business_api_data.{id, name, link}` and `override_callback_uri` (F-207). It lets onboarding confirm the subscription.
- `unsubscribeApp` (D-45) sends `DELETE`; JSDoc: it "will immediately stop all webhook deliveries for this WABA" (F-207). For tenant offboarding.
- JSDoc: a partner must subscribe to **every** tenant WABA individually (F-173).

### 3.5 Register the phone number — `POST /{v}/{phone-number-id}/register` (F-208–F-211)

On `WaClient` (v0.1 §2), created with the tenant's phone number ID and business token.

```ts
registerPhoneNumber(input: { pin: string }, opts?): Promise<{ success: boolean; raw: unknown }>;
// pin: /^\d{6}$/ (F-157, F-208)
// → { "messaging_product": "whatsapp", "pin": "<pin>" }
```

- `data_localization_region` and `backup` are not exposed (C-19; migration is a non-goal).
- The PIN is a secret like the token: never logged, never in an error (§3.8).
- JSDoc, from the docs:
  - Two-step verification is mandatory. If the number already has two-step verification, `pin` must be its existing PIN; otherwise this call sets it (F-208). A wrong PIN is `133005`; too many guesses `133008`; too fast `133009` (F-211).
  - At most **10 register requests per number in 72 hours**; then `133016` and a 72-hour block (F-209). The library never retries; the SaaS should record that registration succeeded and not repeat it.
  - Register within **14 days** of the flow, or the tenant must run Embedded Signup again (F-210). If the tenant left the flow early, the number's certificate may not be ready and registration fails (F-210).
  - `133006` means the number must be verified first; `133015` means it was recently deleted, wait 5 minutes (F-211).
- Whether the number must be `UNVERIFIED` or verified first is contradictory in the docs (C-22); the API decides.

### 3.6 Set the two-step PIN — `POST /{v}/{phone-number-id}` (F-212, D-38)

```ts
setTwoStepPin(input: { pin: string }, opts?): Promise<{ success: boolean; raw: unknown }>;   // pin: /^\d{6}$/
// → { "pin": "<pin>" }
```
JSDoc: there is no endpoint to disable two-step verification (F-212). A PIN the tenant has forgotten is reset in WhatsApp Manager by the tenant (two-step page); the library does not cover that.

### 3.7 Order and error cases

**Recommended order (D-37, C-20).** Meta's pages disagree on the order of subscribe and register and neither says it is required (C-20). The spec follows the Tech Provider page (F-213), adding a confirmation step:

| # | Step | Function | Notes |
|---|---|---|---|
| 0 | Browser posts `{ code, event }` to the server | `parseEmbeddedSignupEvent` | Code TTL 30 s (F-202). Only `kind: "finish"` continues |
| 1 | Exchange the code | `exchangeEmbeddedSignupCode` | Store the token right away, encrypted (§3.8) |
| 2 | Confirm WABA and number | `listPhoneNumbers` + `findPhoneNumber` | D-36. Skip the number check for `FINISH_ONLY_WABA` (no number, F-200) |
| 3 | Subscribe the app to the WABA | `subscribeApp` | F-157, F-173 |
| 4 | Register the number | `registerPhoneNumber` | 10 per 72 h (F-209), within 14 days (F-210). Skip when there is no number |
| 5 | Tenant adds a payment method in WhatsApp Manager | — (not an API) | Needed before sending (F-160, F-213) |
| 6 | Optional: watch for `account_update` `PARTNER_ADDED` | router | Sent when a client completes the flow (F-174) |

The library ships these as separate single-call functions and no orchestrator (D-37): which steps already succeeded is state, and the SaaS owns state.

**Error cases**

| Situation | What the caller sees | Source |
|---|---|---|
| Browser sent a `CANCEL` / `error_report` / `ERROR` event | `parseEmbeddedSignupEvent` returns that kind; nothing to exchange | F-200, F-201 |
| Event not `WA_EMBEDDED_SIGNUP`, or ids not digits | `WaValidationError`, no request | F-200, [lib] |
| Code expired (> 30 s) or reused | `WaApiError` (code not documented) | F-202, G-27 |
| Token response in an unexpected shape | `WaResponseShapeError` without the body | C-14 |
| WABA not visible to the token / no Advanced access | `WaApiError` code `200` (category `auth`) | F-153, F-154 |
| Token invalid or revoked | `WaApiError` code `190` (`auth`) → re-onboard | F-073, F-204, G-19 |
| WABA or number id not found | `WaApiError` code `803` (example only; category `unknown`) | F-207 |
| Event's phone number not on the WABA | `findPhoneNumber` → `undefined`; caller stops | D-36 |
| Register: wrong PIN / guesses / too fast | `133005` / `133008` / `133009` | F-211 |
| Register: rate limit | `133016` (`throttling`, F-075) | F-209 |
| Register: not verified / recently deleted | `133006` / `133015` | F-211 |
| Register after 14 days, or certificate not ready | `WaApiError`; tenant reruns the flow | F-210 |
| Send before a payment method exists | `131042` on send | F-160, F-211 |

No new error category is added (D-11 stays as narrow as it is). The new codes fall into existing categories through `code` (F-071); the README lists them.

### 3.8 Token handling

- `exchangeEmbeddedSignupCode` **returns** the token; it is never stored, cached, logged or attached to an error (D-40). The SaaS stores it per tenant (encrypted at rest is the README's advice [lib]).
- The token, app secret, code and PIN never appear in an error message, an error's own properties, or a URL included in an error (§1.2, test 92).
- **Lifetime, per the docs:** business integration system user tokens "default to never expire" (F-204). Meta's recommended Embedded Signup configuration template is named "…With 60 Expiration Token" (C-16), and tokens generated through the token-management API can be set to expire in 60 days (F-204). So the library assumes nothing: it returns `expiresIn` when Meta sends `expires_in`, and the SaaS treats error `190` as "token no longer valid, re-onboard" (F-073, G-19).
- **Revocation:** the client can invalidate the token by removing the app in Business Settings (F-204). The app then receives `account_update` `PARTNER_APP_UNINSTALLED` (F-174), which the router delivers with the tenant's WABA (§2.1 b), so the SaaS can mark the tenant disconnected without waiting for a `190`.

### 3.9 Limits and partner facts that apply (recap)

| Topic | Fact |
|---|---|
| New customers | 10 per rolling 7 days; 200 after Business Verification, App Review and Access Verification (F-159) |
| Tech Provider | No credit line; each tenant adds its own payment method and is billed by Meta (F-150, F-160) |
| Token type | Tech Providers use business tokens only (F-152) |
| Permissions | `whatsapp_business_management` and `whatsapp_business_messaging`, both with Advanced access (F-154, F-155, F-214); `messages` webhooks need `whatsapp_business_messaging`, all others `whatsapp_business_management` (F-172) |
| Version | v4 is the only current version; v2 was deprecated on 2026-10-15 (F-162). v4 is chosen in the Facebook Login for Business configuration (F-214) |
| Ownership | Tenants own their assets and keep full WhatsApp Manager access (F-158) |
| Registration | 10 per number per 72 h (F-209); within 14 days of the flow (F-210) |

---

## 4. Messages

All three go through `POST /{v}/{phone-number-id}/messages` (F-001) with the v0.1 common fields `to` and `replyToMessageId` (v0.1 §3.1) and return the v0.1 send result (v0.1 §3.5). Lengths count UTF-16 code units, as in v0.1 §3.2 [lib].

### 4.1 Reply buttons — `interactive.type: "button"` (F-230, F-231)

```ts
SendReplyButtonsInput = z.strictObject({
  ...Common,
  header: z.union([
    z.strictObject({ type: z.literal("text"), text: z.string().min(1) }),           // no limit known (G-24)
    z.strictObject({ type: z.literal("document"), document: MediaRef }),           // MediaRef: v0.1 §3.3 (F-016)
    z.strictObject({ type: z.literal("image"),    image: MediaRef }),
    z.strictObject({ type: z.literal("video"),    video: MediaRef }),
  ]).optional(),
  body: z.string().min(1).max(1024),
  footer: z.string().min(1).max(60).optional(),
  buttons: z.array(z.strictObject({
    id: z.string().min(1).max(256),
    title: z.string().min(1).max(20),
  })).min(1).max(3),
});   // plus: button ids unique; button titles unique (F-231)
```
Wire:
```json
{ "messaging_product": "whatsapp", "recipient_type": "individual", "to": "+15550000001",
  "type": "interactive",
  "interactive": { "type": "button",
    "body": { "text": "Invoice INV-0001 is ready. Do you want the PDF here?" },
    "footer": { "text": "Example Traders" },
    "action": { "buttons": [
      { "type": "reply", "reply": { "id": "send-pdf", "title": "Send PDF" } },
      { "type": "reply", "reply": { "id": "later",    "title": "Later" } } ] } } }
```
- A document header's MediaRef carries `id` or `link`; the page calls `link` "not recommended" (F-231), so JSDoc prefers `id`. No `filename` on the header (not documented on this page) [lib].
- The reply arrives as an inbound `interactive` / `button_reply` with the same `id` (F-178, §2.1 a).

### 4.2 List — `interactive.type: "list"` (F-230, F-232)

```ts
SendListInput = z.strictObject({
  ...Common,
  header: z.string().min(1).max(60).optional(),      // text only (F-232) → { type: "text", text }
  body: z.string().min(1).max(4096),
  footer: z.string().min(1).max(60).optional(),
  buttonText: z.string().min(1).max(20),              // → action.button
  sections: z.array(z.strictObject({
    title: z.string().min(1).max(24),                 // always required (C-21, D-41)
    rows: z.array(z.strictObject({
      id: z.string().min(1).max(200),
      title: z.string().min(1).max(24),
      description: z.string().min(1).max(72).optional(),
    })).min(1),
  })).min(1).max(10),
});   // plus: total rows across all sections ≤ 10; row ids unique across the message (F-232)
```
The reply arrives as `interactive` / `list_reply` with the row `id`, `title` and `description` (F-178).

### 4.3 Mark as read and typing indicator (F-234, F-235)

```ts
markAsRead(input: { messageId: string; typingIndicator?: boolean }, opts?): Promise<{ success: boolean; raw: unknown }>;
// → { "messaging_product": "whatsapp", "status": "read", "message_id": "<id>",
//     "typing_indicator": { "type": "text" } }      // only when typingIndicator === true (F-235)
MarkReadResponseSchema = z.looseObject({ success: z.boolean() });   // required [lib]; F-234
```
- `messageId` is an inbound message `id` from a webhook (F-234), non-empty.
- JSDoc: mark within 30 days of receipt; earlier messages in the conversation are marked too; an invalid id returns `131009` (category `parameter`, F-076) (F-234). A typing indicator also marks the message read, is dismissed on reply or after 25 seconds, and should be shown only when a reply will follow (F-235).
- No `to`, no `recipient_type`, no `context` on this body [lib, per F-234].

### 4.4 Customer service window

| Call | Window |
|---|---|
| Reply buttons, list | **Only inside an open customer service window**: they are service messages (F-233, F-031). Outside it the send fails with `131047`; send a template instead (F-033) |
| Mark as read, typing indicator | Not stated (G-25). The only documented limit is 30 days after receipt (F-234) |

The library does not track the window (it has no clock or store). JSDoc on the two send functions says so; a `131047` surfaces as `WaApiError` with its v0.1 category.

---

## 5. Errors

- No new classes and no new category. D-11's exception is unchanged: in particular `2388002` and `2388107`, which appear on the Embedded Signup errors page, are **not** `template_creation` and are never matched.
- Codes the README lists for v0.3 calls: `131009`, `131042`, `131045`, `131047`, `133005`, `133006`, `133008`, `133009`, `133010`, `133015`, `133016`, `190`, `200`, `803` (F-033, F-073, F-075, F-076, F-207, F-209, F-211).

---

## 6. Tests (Vitest; no network; fake fetch; `pnpm test`)

Fake values: CLAUDE.md plus app id `"500000000000005"`, business id `"600000000000006"`, partner portfolio id `"700000000000007"`, code `"test-es-code"`, business token `"test-business-token"`, PIN `"123456"`, message ids `"wamid.test-1"`…, recipients `+1555…`. Numbering continues from v0.2 (66).

**Parser (§2.1)**
67. `interactive` `button_reply` and `list_reply` (with and without `description`) parse with `context`; an unknown `interactive.type` becomes `type: "other"`.
68. `account_update` `PARTNER_ADDED`, `PARTNER_APP_INSTALLED`, `PARTNER_APP_UNINSTALLED`, `PARTNER_REMOVED`: `wabaId` comes from `waba_info.waba_id` and `entryId` keeps `entry.id` when they differ (C-13 fixture shape); without `waba_info`, `wabaId === entryId`; unknown `event` strings parse.
69. An unknown field (e.g. `phone_number_quality_update`) appears in `unhandled` with `field`, `entryId`, `phoneNumberId` when `metadata` exists, and the raw `value`; `skippedChanges === unhandled.length`.

**Router (§2.2–§2.4)**
70. Routing keys per the §2.2 table, including `source`; template and account events carry no `phoneNumberId`.
71. Every item lands in exactly one list; counts add up; payload order kept within each list.
72. Resolver returning `null`/`undefined` → `unrouted` with `reason: "unknown_tenant"`; those items are never passed to `claim`.
73. Resolver called once per distinct key per `route()` call; a second `route()` call calls it again (no state across calls).
74. Resolver throws → `route()` rejects and `claim` was never called.
75. With a fake store: first delivery `routed`, identical second payload → all `duplicates`; error events (`dedupeKey: null`) are routed both times; `claim` receives the default TTL `691200` or the configured one.
76. `claim` rejects on the third item → `release` called for the first two keys, then `route()` rejects with the store's error; without `release` it just rejects.
77. `webhookDedupeKey` matches the §2.4 table exactly (snapshot), including `"-"` for a missing `eventTime`.
78. No idempotency store → no dedupe; all resolved items `routed` with their `dedupeKey` still computed.

**Status reducer (§2.6)**
79. `sent → delivered → read` gives `current: "read"` with all three `seen` timestamps.
80. Every permutation of `{sent, delivered, read}` gives a deep-equal state; applying any update twice changes nothing.
81. `delivered` after `read` fills `seen.delivered`, `current` stays `read`; `played` ranks above `read`.
82. `sent → failed` → `current: "failed"` with errors; `read → failed` and `failed → read` → `current: "read"` with the matching anomaly; both orders give equal states apart from the anomaly label.
83. Unknown status `"deleted"` is recorded once in `unknownStatuses` and changes nothing else.
84. `pricing`/`conversation` follow the greatest `(timestamp, rank)` rule regardless of order; non-numeric `timestamp` is ignored for `seen`.
85. Mismatched `messageId` → `WaValidationError`; the input state object is not mutated (frozen fixture).

**Embedded Signup (§3)**
86. `parseEmbeddedSignupEvent`: finish (with phone), `FINISH_ONLY_WABA` (no phone), multi-WABA `waba_ids`, cancel with each `current_step`, error report, `ERROR`; wrong `type` and non-digit ids → `WaValidationError`; extra fields kept in `raw`.
87. `exchangeEmbeddedSignupCode` sends `GET …/v25.0/oauth/access_token?client_id=500000000000005&client_secret=test-app-secret&code=test-es-code` with **no** `Authorization` header; `redirect_uri` only when given; JSON response → `{ accessToken, tokenType?, expiresIn? }`.
88. Bare-token body `test-business-token` accepted; a body with spaces, several lines, empty, or JSON without `access_token` → `WaResponseShapeError` whose message and properties contain neither the body nor the token.
89. `listPhoneNumbers`: `GET …/200000000000002/phone_numbers` with Bearer `test-business-token`; `fields`, `limit` (0 and 101 rejected, 1 and 100 accepted), cursors; `paging.next` never fetched; an item with only `id` parses; `findPhoneNumber` finds `"100000000000001"` and returns `undefined` for another id.
90. `subscribeApp()` sends `POST …/subscribed_apps` with no body and no `Content-Type`; with `override` sends both fields; `http://` or a 201-character URI, or only one of the two fields → `WaValidationError`, no request; missing `success` → `WaResponseShapeError`. `listSubscribedApps` maps the documented shape; `unsubscribeApp` sends `DELETE`.
91. `registerPhoneNumber({ pin: "123456" })` sends exactly `{ messaging_product: "whatsapp", pin: "123456" }` to `…/100000000000001/register`; PINs `"12345"`, `"1234567"`, `"12a456"` rejected with no request. `setTwoStepPin` sends `{ pin }` to `POST …/100000000000001`.
92. **Secret hygiene:** for failing exchange, register and two-step calls (Graph envelope, HTML 500, network error), `String(err)`, `err.message`, `JSON.stringify(err)` and every own property contain none of `test-app-secret`, `test-es-code`, `test-business-token`, `123456`, nor any URL query string.

**Messages (§4)**
93. Reply buttons: the §4.1 wire body (snapshot); each header type; 1 and 3 buttons accepted, 0 and 4 rejected; id 256 ok / 257 rejected; title 20 ok / 21 rejected; duplicate ids or titles rejected; body 1024 / 1025; footer 60 / 61.
94. List: wire body (snapshot); 10 sections × 1 row accepted; 11 rows across sections rejected; 11 sections rejected; untitled section rejected (D-41); row id 200 / 201, title 24 / 25, description 72 / 73, button text 20 / 21, header 60 / 61, body 4096 / 4097; duplicate row ids rejected.
95. `markAsRead` sends exactly `{ messaging_product, status: "read", message_id }`; with `typingIndicator: true` adds `typing_indicator: { type: "text" }`; `{ success: true }` parses; a `131009` envelope → `WaApiError` category `parameter`.

**Hygiene / shape**
96. New public exports are named only; package-shape test unchanged (no runtime deps, ESM only); the hygiene scan passes over the new tests and docs.

---

## 7. Verify on first live call

Continues v0.2 §10 (V-1–V-18). Run once by the maintainer with a real **test** app, WABA and number before tagging v0.3.0, record the result in `docs/facts.md`, and fix code and tests in the same change. None of this can run here (stop condition 5).

| # | Item | How to check | Pass | If it fails |
|---|---|---|---|---|
| V-19 | **C-14 / C-15 / G-27** code-exchange request and response | Complete Embedded Signup with a test business; exchange the code with and without `redirect_uri`; exchange it again after 30 s | JSON with `access_token`; note `token_type`/`expires_in`; record the error code for the stale code | Adjust D-35 parsing; add the stale-code error as a fact |
| V-20 | **C-16** token lifetime | Check `expires_in` from V-19; call `debug_token` once by hand for `expires_at` | Recorded | Document the real lifetime; the `190` rule stays |
| V-21 | **C-13** `account_update` `entry.id` | Onboard a test tenant; capture `PARTNER_ADDED` / `PARTNER_APP_INSTALLED` | `waba_info.waba_id` is the tenant WABA; record what `entry.id` is | If `entry.id` is the WABA and `waba_info` absent, the fallback already covers it; update C-13 |
| V-22 | **C-22** number state before `register`, register response | Register right after the flow | `{ success: true }` | Record the required state |
| V-23 | **G-24** reply-button text header length | Send headers of 60 and 61 characters | Record any limit | Add the limit with a new F-id |
| V-24 | **G-26** ids stable across redelivery | Return `500` once for a test message webhook; compare the retried payload | Same `messages[].id` / `statuses[].id` | Change the dedupe keys (D-31) |
| V-25 | **G-22 / G-23** status arrival order | Send to a test device; log arrival order of `sent`/`delivered`/`read`; send to an invalid number for `failed` | Reducer state matches the device | Revisit D-34 ranks |
| V-26 | **F-207** `subscribed_apps` with no body; repeat subscribe | `subscribeApp()` twice; `listSubscribedApps()` | `{ success: true }` both times; app listed once | Document the second-call behaviour |
| V-27 | **C-21** one-section list without a title | Send it | Record accepted or rejected | If accepted, D-41 may relax to "required when > 1 section" |
| V-28 | **G-25** mark-as-read / typing outside the window | Mark a message older than 24 h but newer than 30 days as read | Record | Document as window-only if refused |
| V-29 | **C-18** `phone_numbers` fields | `listPhoneNumbers()` with default fields | Record which fields arrive | Adjust the optional fields |
| V-30 | **F-174 / F-204** revocation | Remove the app from the test business's Connected apps | `PARTNER_APP_UNINSTALLED` arrives; the token then fails with `190` | Update §3.8 |
| V-31 | **F-161** `account_update` ignores a WABA override | With an override set (V-14), trigger `PARTNER_APP_INSTALLED` | Arrives at the app default URL | Update §2.5 |

---

## 8. Changeset plan

This PR is spec, sources and facts only, so it adds **no** changeset (as for the v0.2 spec PR). The implementation PR adds one:

```md
---
"wa-cloud-kit": minor
---

v0.3: webhook router with caller-supplied tenant resolver and idempotency store, order-independent
message status reducer, Embedded Signup server helpers (code exchange, phone number listing,
subscribed_apps, register, two-step PIN), interactive reply-button and list messages, mark-as-read
with typing indicator. Parser: new `interactive` inbound type, `account_update` events and an
`unhandled` list — exhaustive switches over `kind`/`type` need a new case.
```

A minor bump under 0.x because of the new union members (D-42), the new `ParsedWebhook.unhandled` field and the new `RequestSpec.auth` default (internal).

---

## 9. Implementation notes for Phase 2 [lib]

- Files: `src/webhooks/router.ts`, `src/webhooks/dedupe.ts`, `src/webhooks/status-reducer.ts`, `src/signup/event.ts`, `src/signup/exchange.ts`, `src/business/phone-numbers.ts`, `src/business/subscribed-apps.ts`, `src/phone/register.ts`, `src/messages/interactive.ts`, `src/messages/read.ts`. Constants carry their fact ids (`// F-231`).
- Tests first, per area, in the §6 order.
- `examples/webhook-handler/server.ts` gains the router with an in-memory store marked demo-only, and `examples/onboarding/complete-signup.ts` shows §3.7 steps 1–4 against env-supplied values.
- README: router recipe, idempotency store requirements, status reducer, onboarding recipe and error table, window table.

---

## 10. Stop conditions

Unchanged from v0.1 §10 / CLAUDE.md. Status for this spec:
- (1) **Not hit.** Every page needed was reachable as raw Markdown, including two Facebook Login pages outside the WhatsApp tree (`documentation/facebook-login/…md`). The only HTML page touched is the Graph Webhooks page, re-read for a response timeout (none found, G-21); no new fact cites it.
- (2) **Hit:** gaps G-21–G-27 recorded with proposed handling. G-22/G-23 (status order) and G-26 (dedupe keys) shape code; D-31 and D-34 need a maintainer answer.
- (3) **Hit:** conflicts C-13–C-22 recorded. **C-13** (routing of `account_update`), **C-14/C-15** (code-exchange response and `redirect_uri`) and **C-21** (list section title) change code; D-32, D-35 and D-41 need a maintainer answer before Phase 2.
- (4) Not hit: all 15 previously stored pages that v0.3 cites again were re-fetched on 2026-10-18 and their sha256 matched the manifest.
- (5) Not hit by the spec. Everything that needs a real app, token or number is in §7.
- (6), (7) Not applicable to a docs-only change; `pnpm check` passes.

---

## 11. Conflicts with existing facts

- **F-085 vs C-13.** F-085 ("`entry[].id` is the WABA ID") holds for `messages`, but the partner pages show a different id in `entry.id` for `account_update` `PARTNER_*` events. F-085 is not changed; C-13 narrows it for that field.
- **G-19** (business token lifetime "not stated") is partly answered by F-204 and replaced by C-16 for the open part. The row is amended, not removed.
- No other existing fact changed. F-157, F-159–F-162 still match the re-fetched pages.

---

## 12. Decisions (proposed — maintainer to confirm)

| ID | Proposal | Recommendation | Affects |
|---|---|---|---|
| D-30 | Resolver takes one key object `{ field, wabaId, phoneNumberId?, source }` and returns a tenant or `null`; the library does no cross-checking itself | **Yes.** One function keeps the API small; the README shows the phone-first lookup with a WABA check | §2.3, tests 70–73 |
| D-31 | Dedupe keys per §2.4 (message id; status id + value; template and account composites; errors never deduped); store interface `claim`/`release?`; default TTL 691 200 s (7 days + 1) | **Yes.** Based on F-083/F-170; ids unverified (G-26, V-24) | §2.4, tests 75–78 |
| D-32 | `account_update` routes by `waba_info.waba_id`, falling back to `entry.id` | **Yes.** All partner examples show `entry.id` as a constant non-tenant id (C-13) | §2.1 b, §2.2, test 68 |
| D-33 | `ParsedWebhook.unhandled` lists unmodelled changes; the router routes them into `unhandled` or `unrouted` | **Yes.** Meets "never thrown away silently"; `skippedChanges` stays for compatibility | §2.1 c, test 69 |
| D-34 | Reducer ranks sent < delivered < read < played; `failed` beats only `sent`; conflicts kept as anomalies; order-independent | **Yes.** Derived from F-176; the docs give no arrival order (G-22, G-23) | §2.6, tests 79–85 |
| D-35 | Code exchange: optional `redirectUri`; parse JSON `access_token`, else accept a single-line bare token; never echo the body | **Yes**, until V-19 shows one form | §3.2, tests 87–88 |
| D-36 | Confirm the WABA and number with `GET /{waba}/phone_numbers` using the business token; do not wrap `debug_token` | **Yes.** Keeps tokens out of URLs and needs no second secret (C-17) | §3.3, test 89 |
| D-37 | Single-call functions only; no onboarding orchestrator; README gives the order exchange → confirm → subscribe → register | **Yes.** Progress is state (CLAUDE.md); order per F-213 (C-20) | §3.7 |
| D-38 | Include `setTwoStepPin` (`POST /{phone-number-id}` `{pin}`) | **Yes**, small and documented (F-212) | §3.6, test 91 |
| D-39 | `parseEmbeddedSignupEvent` validates the browser-sent event (type, digit ids) and returns a tagged union | **Yes.** The event is untrusted input | §3.1, test 86 |
| D-40 | The token is returned as a plain string, never stored, logged or put in errors; no redacting wrapper type | **Yes.** A wrapper adds API surface without stopping a caller from logging `.value` | §3.8, test 92 |
| D-41 | List section `title` always required | **Yes**, the stricter reading of C-21; revisit after V-27 | §4.2, test 94 |
| D-42 | New `interactive` inbound variant and `account_update` event kind; release as minor | **Yes** (0.x minor; flagged in the changeset) | §2.1, §8 |
| D-43 | Unrouted items are not claimed in the idempotency store | **Yes.** A redelivery after the tenant is added is processed | §2.3 rule 3, test 72 |
| D-44 | `subscribeApp` accepts an optional `override { callbackUri, verifyToken }` (https, ≤ 200 chars) | **Yes.** Per-tenant callback URLs are a documented partner pattern (F-161) | §3.4, test 90 |
| D-45 | Include `listSubscribedApps` and `unsubscribeApp` | **Yes.** Confirmation and tenant offboarding | §3.4, test 90 |
