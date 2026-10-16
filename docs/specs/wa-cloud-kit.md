# wa-cloud-kit — v0.1 specification

**Status:** Implemented for v0.1 (Step 2). Implementation notes that refine this spec are marked *Impl note*.
**Package:** `wa-cloud-kit` on npm. MIT, © 2026 Suresh Kumar Muvvala. Public.
**Facts:** every Meta behaviour below cites an ID in [`docs/facts.md`](../facts.md) (`F-xxx`, conflicts `C-x`, gaps `G-x`). All of them were retrieved on 2026-10-16. A behaviour not marked with an ID is a library design choice and is labelled **[lib]**.

---

## 0. Purpose, scope, non-goals

wa-cloud-kit is a small, typed, dependency-free client for the Meta WhatsApp Cloud API. The first consumer will be a multi-tenant accounting SaaS. In that SaaS each tenant (the SaaS's client) sends invoices to its own customers, from its own WhatsApp number and with its own signature. The library therefore holds **no tenant state**: every call receives the tenant's config.

**In scope (v0.1)**
1. Send a template message: body variables (named or positional), plus an optional DOCUMENT header (an invoice PDF) given by media `id` or `link`.
2. Send a plain text message and a document message. Both only work inside the customer service window (F-030, F-031).
3. Upload media (`POST /{v}/{phone-number-id}/media`).
4. Webhooks: the GET verification handshake, the `X-Hub-Signature-256` check, and parsing of message and status events.
5. A helper that renders a tenant's signature into a template body variable.
6. Transport through an injectable `fetch`, and typed errors built from the Graph API error format.

**Non-goals (v0.1):**
- template creation and management
- interactive, location, contacts, reaction and group messages
- media download and delete
- Embedded Signup and token exchange
- retries, back-off, queues and rate limiting (callers own these; F-007 is documented only)
- persistence of any kind
- a Meta SDK dependency
- an HTTP framework adapter (callers wire the handlers into Express, Hono and so on)
- CommonJS output

---

## 1. Toolchain & package contract

| Item | Value |
|---|---|
| Package manager | `pnpm@11.25.0`, set in `"packageManager"` |
| Node | `.nvmrc` = `22.22.2`; `"engines": { "node": ">=22" }` |
| TypeScript | `~6.0`, `strict: true`, `module`/`moduleResolution: "NodeNext"`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules` |
| Module format | ESM only: `"type": "module"`, an `exports` map with `types` + `import`, and no `main`/`require` |
| Exports | **Named exports only.** ESLint `no-restricted-syntax` bans `ExportDefaultDeclaration`. |
| Zod | `peerDependencies.zod: "^4.0.0"`, `devDependencies.zod: "4.5.4"`. Import from `"zod"` (v4 API). |
| Runtime deps | **None** (the zod peer only) |
| Tests | Vitest |
| Lint | ESLint flat config using `typescript-eslint` `strictTypeChecked` (+ `stylisticTypeChecked` optional), with type-aware `parserOptions.projectService`. *Impl note:* the config file is `eslint.config.cjs` (`module.exports`) so the repo has no `export default` anywhere. |
| Format | Prettier (the lint config defers formatting to Prettier) |
| Release | Changesets (`.changeset/`). Every user-visible change needs a changeset. |
| Gate | `pnpm check` = `pnpm typecheck && pnpm lint && pnpm test` |
| Build | `tsc -p tsconfig.build.json` → `dist/` (`.js` + `.d.ts`) |

Planned layout:
```
src/
  index.ts            # re-exports (named)
  config.ts           # WaClientConfig schema
  client.ts           # createWaClient (Impl note: not in the original layout)
  transport.ts        # request(): URL build, auth header, fetch, error mapping
  errors.ts           # error classes + waErrorCategory
  messages/{text,document,template,common}.ts
  media/upload.ts
  webhooks/{verify-challenge,verify-signature,parse,schemas,constant-time}.ts
  signature/render.ts
test/ (mirrors src/, plus fixtures/ copied from doc examples with fake IDs)
docs/  sources/
```

---

## 2. Configuration (per tenant, per call, nothing stored)

```ts
export const WaClientConfigSchema = z.object({
  phoneNumberId: z.string().regex(/^\d+$/),          // [lib] digits; path segment (F-001)
  accessToken: z.string().min(1),                      // opaque; never parsed or logged (F-003)
  graphApiVersion: z.string().regex(/^v\d+\.\d+$/),    // required, no default (F-004, F-005)
  baseUrl: z.url().default("https://graph.facebook.com"), // F-001
  fetch: z.custom<typeof globalThis.fetch>().optional(), // default: globalThis.fetch
});
export type WaClientConfig = z.input<typeof WaClientConfigSchema>;
```

- **No default version [lib].** Meta's examples use `v25.0` (F-006), the latest release is `v26.0` (F-005), and versions expire (F-004). An unversioned call silently uses the app-dashboard version (F-005). The caller must therefore choose. The README example uses `v26.0` (D-3). Next to it, a note says the version is required config, that callers should pin the version they have tested against, and links F-004 for expiry dates.
- `accessToken` never appears in error messages, `toString()` or thrown objects [lib].

```ts
export function createWaClient(config: WaClientConfig): WaClient;
export interface WaClient {
  sendText(input: SendTextInput, opts?: RequestOptions): Promise<SendMessageResult>;
  sendDocument(input: SendDocumentInput, opts?: RequestOptions): Promise<SendMessageResult>;
  sendTemplate(input: SendTemplateInput, opts?: RequestOptions): Promise<SendMessageResult>;
  uploadMedia(input: UploadMediaInput, opts?: RequestOptions): Promise<UploadMediaResult>;
}
export interface RequestOptions { signal?: AbortSignal }
```

`createWaClient` validates the config once and returns a closure. It keeps no cache and no mutable state [lib]. The SaaS may create one client per request or per tenant.

The payload builders `buildTextMessage`, `buildDocumentMessage` and `buildTemplateMessage` are exported as pure functions that return the exact JSON body. They make snapshot tests and auditing easy.

---

## 3. Sending messages

`POST {baseUrl}/{graphApiVersion}/{phoneNumberId}/messages` with headers `Authorization: Bearer {accessToken}` (F-002) and `Content-Type: application/json` (F-001).

### 3.1 Common request fields (F-010)
```ts
const Recipient = z.string().min(1); // passed through unchanged (F-013); see note
const Common = {
  to: Recipient,
  replyToMessageId: z.string().min(1).optional(), // → context.message_id (F-010)
};
```
Emitted fields are `messaging_product: "whatsapp"`, `recipient_type: "individual"` (groups are out of scope), `to`, `type`, and `context` when replying.

*Note [lib]:* `to` is not normalized. JSDoc warns that Meta prepends the business number's country code when `+` is missing and recommends sending `+` and the country code (F-013).

### 3.2 Text (F-020) — window-only (F-031)
```ts
SendTextInput = { ...Common, body: z.string().min(1).max(4096), previewUrl: z.boolean().optional() }
// → { ..., type: "text", text: { body, preview_url? } }   (preview_url omitted when undefined)
```
`.max(4096)` counts UTF-16 code units, matching JavaScript string length. JSDoc states this [lib].

### 3.3 Document (F-021, F-016) — window-only (F-031)
```ts
MediaRef = z.union([ z.object({ id: z.string().min(1) }).strict(),
                     z.object({ link: z.url({ protocol: /^https?$/ }) }).strict() ])   // F-016, G-6
SendDocumentInput = { ...Common, document: MediaRef,
                      caption: z.string().min(1).max(1024).optional(),   // F-021
                      filename: z.string().min(1).optional() }           // F-021
// → { ..., type: "document", document: { id | link, caption?, filename? } }
```

### 3.4 Template (F-040–F-048)
```ts
TextParam       = { type: "text", text: string(min 1) }
NamedTextParam  = { type: "text", parameter_name: /^[a-z_]+$/ , text: string(min 1) }   // F-042
CurrencyParam   = { type: "currency", currency: { fallback_value, code, amount_1000: int } } // F-048
DateTimeParam   = { type: "date_time", date_time: { fallback_value } }               // F-048

SendTemplateInput = {
  ...Common,
  name: z.string().min(1),
  languageCode: z.string().min(1),                 // → template.language.code
  header: z.object({ document: MediaRef }).optional(), // F-045, F-046, F-047; no filename (G-1)
  body: z.union([
    z.object({ format: z.literal("named"),      parameters: z.array(NamedTextParam).min(1) }),
    z.object({ format: z.literal("positional"), parameters: z.array(TextParam | CurrencyParam | DateTimeParam).min(1) }),
  ]).optional(),
}
```

**Rules:**
- Named parameter names must be unique within the body (F-042). Duplicates raise `WaValidationError`.
- Positional parameters are sent in array order; the caller owns the order (F-043).
- Named and positional parameters cannot be mixed. The discriminated `format` makes that unrepresentable (F-041).
- A component is emitted only when it has parameters. A template with no variables sends `components` omitted [lib].

Emitted payload:
```json
{ "messaging_product":"whatsapp","recipient_type":"individual","to":"…","type":"template",
  "template":{ "name":"…","language":{"code":"…"},
    "components":[
      {"type":"header","parameters":[{"type":"document","document":{"id":"…"}}]},
      {"type":"body","parameters":[{"type":"text","parameter_name":"customer_name","text":"…"}]}
    ]}}
```

**Not validated client-side** (so the API decides; the docs give no client-checkable rule):
- template existence and approval (F-040, `132001`)
- parameter count vs the template (`132000`)
- per-parameter length (G-3)
- template category (F-050)

### 3.5 Response (F-011, F-012)
```ts
SendMessageResponseSchema = z.looseObject({
  messaging_product: z.literal("whatsapp"),
  contacts: z.array(z.looseObject({ input: z.string(), wa_id: z.string() })),
  messages: z.array(z.looseObject({
    id: z.string(),
    message_status: z.enum(["accepted","held_for_quality_assessment","paused"]).optional(),
  })).min(1),
});
SendMessageResult = { messageId: string; waId?: string; messageStatus?: …; raw: SendMessageResponse }
```
- `looseObject` means fields Meta adds later do not break callers [lib].
- JSDoc says that a success response means *accepted, not delivered* (F-012), and that delivery order is not guaranteed (F-014).

---

## 4. Media upload (F-060–F-064)

`POST {baseUrl}/{v}/{phoneNumberId}/media`, sent as `multipart/form-data` built with the global `FormData` and `Blob`. No `Content-Type` header is set manually; fetch sets the boundary.

```ts
UploadMediaInput = {
  file: z.instanceof(Blob),
  mimeType: z.enum(SUPPORTED_UPLOAD_MIME_TYPES),  // F-063; documents + jpeg/png only (D-2)
  filename: z.string().min(1),
}
// form fields: messaging_product=whatsapp, type=<mimeType>, file=<Blob typed mimeType, filename>   (F-060, C-4)
UploadMediaResponseSchema = z.looseObject({ id: z.string().min(1) })              // F-061
UploadMediaResult = { mediaId: string }
```

- **Size check:** `file.size` must not exceed the documented maximum for the MIME type (F-063: 100 MB for documents, 5 MB for images). A larger file raises `WaValidationError` before any request is sent. *Impl note:* the docs do not say whether MB is 10^6 or 2^20 bytes (G-8, open); v0.1 uses 10^6 (100,000,000 and 5,000,000 bytes), the stricter reading.
- The JSDoc says the media ID expires 30 days after upload (F-062), so callers should upload close to send time.
- `SUPPORTED_UPLOAD_MIME_TYPES` and `MAX_UPLOAD_BYTES` are exported constants, each annotated with `// F-063`.

---

## 5. Errors

All errors extend `WaError extends Error` and carry a `name` discriminant.

| Class | When | Key fields |
|---|---|---|
| `WaValidationError` | Caller input or config fails Zod. **No request is sent.** | `issues: z.core.$ZodIssue[]` |
| `WaTransportError` | `fetch` throws (network, abort, DNS) | `cause` |
| `WaApiError` | Non-2xx response whose body matches the Graph error envelope (F-070) | `httpStatus`, `code`, `type`, `details?`, `fbtraceId?`, `errorSubcode?`, `category`, `raw` |
| `WaHttpError` | Non-2xx response whose body is **not** the envelope (HTML, empty, other JSON) | `httpStatus`, `bodyText` (truncated to 2 KB [lib]) |
| `WaResponseShapeError` | 2xx response that fails the response schema | `issues`, `raw` |

```ts
GraphErrorEnvelopeSchema = z.object({ error: z.looseObject({
  message: z.string(), type: z.string().optional(), code: z.number().int(),
  error_data: z.looseObject({ messaging_product: z.string().optional(), details: z.string().optional() }).optional(),
  error_subcode: z.number().int().optional(),   // deprecated v16.0+ (F-071)
  fbtrace_id: z.string().optional(),
}) });
```

**Category is derived from `code` only**, never from HTTP status or subcode (F-071, G-5):

```ts
export type WaErrorCategory =
  | "auth" | "integrity" | "throttling" | "service_window_closed" | "template"
  | "recipient" | "media" | "parameter" | "server" | "unknown";
export function waErrorCategory(code: number): WaErrorCategory;
```

| Category | Codes | Source |
|---|---|---|
| `auth` | 0, 3, 10, 190, 200–299, 131005 | F-073, F-076 |
| `integrity` | 368, 130497, 131031 | F-074 |
| `throttling` | 4, 80007, 130429, 131048, 131056, 131064, 133016 | F-075 |
| `service_window_closed` | 131047 | F-033 |
| `template` | 132000, 132001, 132005, 132007, 132012, 132015, 132016 | F-051 |
| `recipient` | 130403, 131021, 131026, 131049, 131050 | F-076 |
| `media` | 131052, 131053 | F-064, F-076 |
| `parameter` | 100, 131008, 131009, 131051 | F-076 |
| `server` | 1, 2, 131000, 131016, 131057 | F-076 |
| `unknown` | anything else | [lib] |

- `WaApiError.message` is `error.message` from Meta (e.g. `(#131047) …`) and never includes the token.
- The same category function also applies to webhook `errors[]` objects (F-072, F-092).

---

## 6. Webhooks

The library is framework-agnostic. Callers pass in the query parameters, raw body and header values.

### 6.1 Verification handshake (F-080, F-081, C-2)
```ts
export function verifyWebhookChallenge(
  query: URLSearchParams | Readonly<Record<string, string | undefined>>,
  verifyToken: string,
): { ok: true; challenge: string } | { ok: false; reason: "mode" | "token" | "challenge" };
```
- `ok` requires all of: `hub.mode === "subscribe"` (F-081); `hub.verify_token` equal to `verifyToken`, compared in constant time [lib]; and a non-empty `hub.challenge`.
- The caller responds `200` with `challenge` as the body. Otherwise they respond with a 4xx (F-080).
- The challenge is returned exactly as received, as a string (C-2).
- *Impl note [lib]:* an empty `verifyToken` throws `WaValidationError`, matching the empty-`appSecret` rule in §6.2, so a missing env var can never accept an empty `hub.verify_token`.

### 6.2 Signature check (F-082, G-4)
```ts
export async function verifyWebhookSignature(input: {
  rawBody: string | Uint8Array;           // exact bytes received; NOT re-serialized JSON
  signatureHeader: string | null | undefined;  // value of X-Hub-Signature-256
  appSecret: string;
}): Promise<boolean>;
```
- The header must match `/^sha256=[0-9a-f]{64}$/` (F-082). Anything else returns `false`.
- It computes HMAC-SHA256 over the raw body bytes (a string is UTF-8 encoded) with `appSecret` as the key, using `globalThis.crypto.subtle`, which is available in Node 22 and edge runtimes [lib].
- The two digests are compared in constant time (G-4).
- It never throws on bad input; it returns `false`. It throws `WaValidationError` only if `appSecret` is empty [lib].
- Docs note: re-serializing parsed JSON changes the bytes. Callers must capture the raw body.

### 6.3 Payload parsing (F-085–F-092)
```ts
export function parseWebhookPayload(body: unknown): ParsedWebhook;
export interface ParsedWebhook { events: WaWebhookEvent[]; skippedChanges: number }

type Base = { wabaId: string; phoneNumberId: string; displayPhoneNumber: string };
export type WaWebhookEvent =
  | (Base & { kind: "message"; contact?: { name: string; waId?: string }; message: WaInboundMessage })
  | (Base & { kind: "status";  status: WaMessageStatus })
  | (Base & { kind: "error";   error: WaWebhookError });

export type WaInboundMessage =   // common: from, id, timestamp, context? (F-087, F-089)
  | { type: "text"; text: { body: string } }                                            // F-087
  | { type: "document"; document: { id: string; mime_type: string; sha256: string;
        filename?: string; caption?: string; url?: string } }                           // F-088
  | { type: "image"; image: { id: string; mime_type: string; sha256: string; caption?: string; url?: string } } // F-088
  | { type: "button"; button: { payload: string; text: string } }                       // F-089
  | { type: "unsupported"; unsupported?: { type: string }; errors: WaWebhookError[] }    // F-090
  | { type: "other"; originalType: string; raw: Record<string, unknown> };               // [lib] forward-compat

export const KNOWN_MESSAGE_STATUSES = ["sent", "delivered", "read", "failed", "played"] as const; // F-091, C-3
export type WaKnownMessageStatus = (typeof KNOWN_MESSAGE_STATUSES)[number];
export type WaMessageStatus = {
  id: string;
  timestamp: string; recipient_id: string;
  pricing?: { billable?: boolean; pricing_model?: string; category?: string; type?: string };
  conversation?: { id: string; expiration_timestamp?: string; origin?: { type: string } };
  errors?: WaWebhookError[];
} & (
  | { known: true;  status: WaKnownMessageStatus }   // value is in F-091's list
  | { known: false; status: string }                 // D-1: unrecognised value passed through raw
);
export type WaWebhookError = { code: number; title: string; message?: string;
  error_data?: { details?: string }; href?: string; category: WaErrorCategory };          // F-092
```

**Rules:**
- `object` must equal `"whatsapp_business_account"` (F-085). Otherwise the function throws `WaValidationError`.
- Only `field === "messages"` changes are mapped. Any other field (group_* and future ones) increments `skippedChanges` and does not throw (F-085) [lib].
- A message with an unrecognized `type` becomes `{type:"other"}` and is never rejected [lib].
- An unrecognised status value is **not** an error (D-1). It is emitted as a normal `kind:"status"` event with `known: false` and the raw string in `status`. Recognised values get `known: true` and the narrowed union type.
- Batches hold at most 1000 updates (F-083). Events keep payload order (entry → change → messages, then statuses, then errors).
- `pricing` and `conversation` are optional and loose. `conversation` is absent on v24.0+ in most cases (F-091).
- Every object schema is `looseObject`, so unknown fields are tolerated.

**Caller guidance** (README, from docs):
1. Respond 200 quickly (F-083).
2. Dedupe on `message.id` or `status.id + status`, because deliveries are retried for 7 days and can be duplicated (F-083, F-084, C-1).
3. Expect payloads up to 3 MB (F-084).
4. Media IDs in webhooks expire after 7 days (F-062).

---

## 7. Signature helper (the tenant's sign-off as a template variable)

The SaaS registers one utility template (F-050), for example a body like `… Regards, {{signature}}`. It fills `{{signature}}` per tenant.

```ts
export interface TenantSignature {
  name: string;          // e.g. "Accounts Team"
  title?: string;        // e.g. "Billing"
  company?: string;      // e.g. "Example Traders"
  lines?: string[];      // extra lines, e.g. a support email
}
export function renderSignatureParameter(input: {
  signature: TenantSignature;
  parameterName?: string;     // if set → NamedTextParam (must match /^[a-z_]+$/, F-042); else TextParam
  separator?: string;         // default " | "  (G-2, user decision)
}): TextParam | NamedTextParam;

export function assertTemplateBodyLength(
  templateBodyText: string,                          // the approved template body, with placeholders
  parameters: readonly (TextParam | NamedTextParam)[],
): void;                                             // throws WaValidationError if rendered length > 1024 (F-044)
```

**Rendering rules**
1. Parts are taken in order `name`, `title`, `company`, `...lines`. Each is trimmed and empty parts are dropped [lib].
2. Inside each part, every run of whitespace (including `\n`, `\r` and `\t`) collapses to one space. Parts are joined with `separator`. The output never contains `\n` or `\t` (G-2) [lib].
3. If the result is empty, the function throws `WaValidationError`. An empty variable value would leave a dangling or empty parameter (F-049).
4. `separator` must not contain `\n` or `\t` (G-2).
5. The helper does **not** strip `#`, `$` or `%`. F-049 lists them as reasons for *template review* rejection, which applies to the template definition, not to send-time values. The JSDoc points to F-049.
6. `assertTemplateBodyLength` substitutes `{{name}}` or `{{n}}` with the parameter values and checks against 1024 (F-044). It is optional, because the library does not hold templates.

---

## 8. Security & privacy rules

- No access token, app secret, verify token or real phone number appears in the repo, tests, fixtures or docs. The only exceptions are Meta's own fictional sample values quoted verbatim inside `sources/`.
- Tokens are never logged, never echoed into error messages, and never attached to error objects [lib].
- Signature checks always run on the raw bytes (§6.2).
- The library keeps no global state and no storage. Config is passed per call (§2).

---

## 9. Test list (Vitest; no network; `pnpm test`)

Shared test helpers:
- **Fake fetch:** `fakeFetch(responses)` records `{url, method, headers, body}` and returns canned `Response` objects.
- **Fake identifiers:** phone-number id `"100000000000001"`, WABA id `"200000000000002"`, recipient `"+15550000001"` (all 555 numbers are fictional), access token `"test-token"`, app secret `"test-app-secret"`, verify token `"test-verify-token"`.
- **Fixtures:** taken from doc examples, with every ID replaced by these fakes.

**Config / transport**
1. Rejects an empty `phoneNumberId` or `accessToken`, and a `graphApiVersion` of `"25"`, `"v25"` or `"latest"`.
2. Builds `https://graph.facebook.com/v25.0/100000000000001/messages`. Honors `baseUrl` and the injected `fetch`.
3. Sends `Authorization: Bearer test-token` and `Content-Type: application/json`.
4. `signal` is passed to fetch. Aborting raises `WaTransportError`.
5. The token never appears in any thrown error's `message`, `stack` or JSON form.

**Text**
6. Payload snapshot matches §3.2. `preview_url` appears only when it is set.
7. A 4096-char body is accepted; 4097 or empty is rejected with no fetch call.
8. `replyToMessageId` produces `context.message_id`.

**Document**
9. Accepts `{id}` and `{link}`. Rejects both together, neither, and a non-http(s) link.
10. Caption of 1024 is accepted and 1025 rejected. `filename` passes through.

**Template**
11. Named body parameters produce `parameter_name`. Duplicate names are rejected. A name with a capital or digit is rejected.
12. Positional order is preserved. Currency and date_time are serialized as in F-048.
13. A document header by `id` and by `link` matches F-046. The header type rejects `filename` (G-1).
14. No `body` and no `header` means `components` is omitted.
15. A full invoice example (header PDF + named body + rendered signature) matches a snapshot.

**Responses & errors**
16. The doc example response parses. Extra unknown fields are tolerated. `message_status` is optional.
17. A 2xx with `messages: []` or a missing `id` raises `WaResponseShapeError`.
18. A 400 with the Graph envelope raises `WaApiError` with `code`, `details`, `fbtraceId` and `httpStatus`.
19. `waErrorCategory` matches every row of the §5 table (table-driven), and returns `unknown` for, e.g., 999999.
20. A non-envelope error body (HTML, empty) raises `WaHttpError`. A fetch rejection raises `WaTransportError`.

**Upload**
21. The multipart body has `messaging_product=whatsapp`, `type=application/pdf`, and `file` with the filename and MIME type. No manual Content-Type header is set.
22. MIME types outside F-063 are rejected. A file larger than the limit is rejected; the limit is checked using a Blob stub reporting `size`, not a real 100 MB allocation.
23. `{id}` is parsed into `mediaId`. A missing `id` raises `WaResponseShapeError`.

**Webhook verification**
24. A valid query returns `{ok:true, challenge}` exactly as given (string), for both `URLSearchParams` and a record.
25. The wrong mode, wrong token, or missing or empty challenge each return `{ok:false}` with the correct `reason`.

**Signature**
26. A known vector passes. The expected HMAC is computed inside the test with `node:crypto` (`createHmac`) over a fixture body with `test-app-secret`.
27. Both a string body and a `Uint8Array` body pass.
28. A body changed by one byte, the wrong secret, a missing header, a `sha1=` prefix, uppercase hex, or a 63- or 65-char digest each return `false`.
29. A non-ASCII body (e.g. `"₹"`) is verified over its UTF-8 bytes.

**Webhook parsing** (fixtures derived from the doc examples)
30. Text, document, image and button messages are mapped with the contact and metadata.
31. An unsupported message with error `131051` gets `category: "parameter"`.
32. Statuses `sent` (with pricing), `delivered`, `read`, `failed` (with errors, categorized) and `played` all parse with `known: true`. A status of `"deleted_future_value"` parses as a status event with `known: false` and the raw string, and no error event is emitted (D-1).
33. `value.errors` produces `kind:"error"` events.
34. An unknown message `type` becomes `other` with `originalType`. A `group_lifecycle_update` change increments `skippedChanges`.
35. `object !== "whatsapp_business_account"` raises `WaValidationError`.
36. A multi-entry, multi-change batch is flattened in order.

**Signature helper**
37. With `{name}` only, the output is the name.
38. With all parts, the output joins them with `" | "`. A custom separator works.
39. Newlines and tabs inside parts collapse to spaces. The output never contains `\n` or `\t`. A separator containing `\n` is rejected.
40. Empty or whitespace-only parts are dropped. An all-empty signature is rejected.
41. `parameterName` produces a named parameter. An invalid name is rejected.
42. `assertTemplateBodyLength` passes when the rendered body is exactly 1024 and throws at 1025, for both named and positional placeholders.

**Hygiene**
43. A repo scan test fails if `src/`, `test/` or `docs/` contain `EAA[A-Za-z0-9]{10,}` or an E.164-looking number outside the `+1555…` fictional range. `sources/` is exempt because it holds verbatim Meta samples.
44. A package-shape test checks that `package.json` has `"type":"module"`, no `default` export in the `exports` map, no runtime `dependencies`, and a zod peer of `^4.0.0`.

---

## 10. Stop conditions

Stop and ask the maintainer, without guessing, when any of these happen:
1. A page needed for a fact is unreachable, returns only an HTML shell with no usable `.md` or text, or needs login. Report the exact URL so it can be attached.
2. A behaviour the code needs is not stated on any fetched page. Record it as a new `G-x` first.
3. Two Meta pages conflict on something the code depends on. Record it as a new `C-x`.
4. A re-fetched source's sha256 differs from `sources/manifest.json` (Markdown pages) and the change touches a cited fact.
5. The work would need a real token, phone number, app secret or Meta SDK, or would require storing anything.
6. A toolchain pin from §1 cannot be installed exactly (pnpm 11.25.0, Node 22.22.2, TS ~6.0, zod 4.5.4).
7. `pnpm check` cannot pass without disabling a lint rule, a strict compiler flag or a test.

---

## 11. Decisions

Maintainer decisions (2026-10-16). These are library choices, not Meta facts.

| ID | Decision | Affects |
|---|---|---|
| D-1 | An unrecognised webhook status value is not an error. It is passed through as a `kind:"status"` event with the raw string in `status` and `known: false`. | §6.3, test 32 |
| D-2 | v0.1 media upload accepts only the document MIME types plus `image/jpeg` and `image/png` (all from F-063). Audio, video and sticker are out of scope for v0.1. | §4, tests 21–22 |
| D-3 | The README example uses `graphApiVersion: "v26.0"`, with a note that the version is required config and callers should pin the version they have tested. | §2 |
| D-4 | No `filename` on a template DOCUMENT header parameter in v0.1 (G-1). | §3.4, test 13 |
| D-5 | The signature helper joins parts with `" \| "` and never emits `\n` or `\t` (G-2). | §7, tests 38–39 |
