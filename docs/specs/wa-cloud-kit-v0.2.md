# wa-cloud-kit — v0.2 specification

**Status:** Draft for maintainer review. Spec only: no code changes in this branch.
**Builds on:** [`wa-cloud-kit.md`](wa-cloud-kit.md) (v0.1, implemented). Section numbers here are independent; v0.1 sections are cited as "v0.1 §n".
**Facts:** every Meta behaviour cites an ID in [`docs/facts.md`](../facts.md). New IDs in this spec: `F-100`–`F-125` (templates), `F-130`–`F-136` (media), `F-150`–`F-162` (multi-tenant), conflicts `C-6`–`C-11`, gaps `G-9`–`G-19`. All were retrieved on 2026-10-16. A behaviour without an ID is a library choice, labelled **[lib]**.

---

## 0. Purpose, scope, non-goals

v0.2 adds what a multi-tenant invoicing SaaS needs around v0.1's send path: creating and tracking the utility template that carries an invoice PDF, reading and deleting media, and enough documentation (examples, tenant facts) to wire it up. The library stays stateless: every call receives the tenant's config (v0.1 §0).

**In scope**
1. Template management for a WABA: create (UTILITY, DOCUMENT header, body variables), list, get status, delete; review states and rejection reasons (§2).
2. A `message_template_status_update` webhook event in the parser (§5).
3. Media: get URL, download with auth, delete (§3).
4. Error category `template_creation` (§4, D-7).
5. A plan for `examples/` (§6).
6. A facts-only multi-tenant note (§7).

**Non-goals (v0.2)**
- The Resumable Upload API. The caller supplies the sample `header_handle` (D-6, G-11, C-8).
- Template edit, archive, unarchive; button, footer-with-variable, carousel, location, authentication and marketing templates; library templates.
- Embedded Signup, code→token exchange, `subscribed_apps`, phone `register`, webhook override: documented in §7 only, no implementation.
- Retries, queues, rate limiting (the 100-templates-per-hour limit, F-105, is documented and not enforced).
- Persistence, caching, any Meta SDK, any runtime dependency besides the `zod` peer.

---

## 1. Configuration

Two scopes, because Meta addresses templates by WABA and sending/media by phone number:

```ts
export const WaBusinessConfigSchema = z.object({
  wabaId: z.string().regex(/^\d+$/),                     // [lib] digits; path segment (F-100)
  accessToken: z.string().min(1),                          // opaque; never parsed or logged (F-003)
  graphApiVersion: z.string().regex(/^v\d+\.\d+$/),        // required, no default (F-004, F-005)
  baseUrl: z.url().default("https://graph.facebook.com"),  // F-100
  fetch: z.custom<typeof globalThis.fetch>().optional(),
});
export type WaBusinessConfig = z.input<typeof WaBusinessConfigSchema>;

export function createWaBusinessClient(config: WaBusinessConfig): WaBusinessClient;
export interface WaBusinessClient {
  createTemplate(input: CreateTemplateInput, opts?: RequestOptions): Promise<CreateTemplateResult>;
  listTemplates(input?: ListTemplatesInput, opts?: RequestOptions): Promise<ListTemplatesResult>;
  getTemplate(input: GetTemplateInput, opts?: RequestOptions): Promise<WaTemplate>;
  deleteTemplate(input: DeleteTemplateInput, opts?: RequestOptions): Promise<DeleteTemplateResult>;
}
```

- The existing `WaClient` (v0.1 §2, `phoneNumberId`-scoped) gains the three media methods (§3). A SaaS holds, per tenant, one `WaClientConfig` and one `WaBusinessConfig` that share the token (§7).
- `WaBusinessClient` keeps no state or cache [lib]; it may be created per request.
- All requests send `Authorization: Bearer <token>` (F-002, F-101). The token appears only in that header (v0.1 §8).
- **Transport change [lib]:** v0.1's internal `request()` is POST-only, JSON-only and phone-number-scoped (`messages`/`media`). v0.2 generalizes it to `{ method, path, query?, json?, form?, parse: "json" | "none" }` with the same error mapping (`WaTransportError`, `WaApiError`, `WaHttpError`, `WaResponseShapeError`). The binary download (§3.2) uses its own guarded path and does not go through `request()`.

---

## 2. Template management

### 2.1 Create — `POST /{v}/{waba-id}/message_templates` (F-100, F-102)

```ts
const TemplateName = z.string().max(512).regex(/^[a-z0-9_]+$/);            // F-104

const BodyExamples = z.union([
  z.object({ format: z.literal("named"),                                    // F-108
             examples: z.array(z.object({ name: z.string().regex(/^[a-z_]+$/), example: z.string().min(1) })).min(1) }),
  z.object({ format: z.literal("positional"),
             examples: z.array(z.string().min(1)).min(1) }),                // → body_text: [[…]]
]);

CreateTemplateInput = z.strictObject({
  name: TemplateName,
  language: z.string().min(1),                       // e.g. "en_US"; not enumerated (list page not fetched)
  category: z.literal("UTILITY"),                    // [lib] v0.2 supports UTILITY only; enum is F-103
  header: z.strictObject({
    format: z.literal("DOCUMENT"),                    // F-107, C-7
    headerHandle: z.string().min(1),                  // opaque, caller-supplied (D-6, C-8, G-18)
  }).optional(),
  body: z.strictObject({ text: z.string().min(1).max(1024) /* F-044 */, ...BodyExamples }),
  footer: z.strictObject({ text: z.string().min(1).max(60) }).optional(),  // F-045; no variables in v0.2
  messageSendTtlSeconds: z.int().positive().optional(),                    // F-102
});
```

**Emitted wire body** (uppercase enums per the reference, C-6; `parameter_format` follows `body.format`):

```json
{
  "name": "invoice_with_pdf",
  "language": "en_US",
  "category": "UTILITY",
  "parameter_format": "NAMED",
  "components": [
    { "type": "HEADER", "format": "DOCUMENT", "example": { "header_handle": ["test-header-handle"] } },
    { "type": "BODY",
      "text": "Hello {{customer_name}}, invoice {{invoice_number}} for {{amount}} is attached and due on {{due_date}}. For any questions contact {{signature}}. Thank you.",
      "example": { "body_text_named_params": [
        { "param_name": "customer_name",  "example": "Alex" },
        { "param_name": "invoice_number", "example": "INV-0001" },
        { "param_name": "amount",         "example": "120.00" },
        { "param_name": "due_date",       "example": "1 December" },
        { "param_name": "signature",      "example": "Accounts Team | Example Traders" } ] } },
    { "type": "FOOTER", "text": "Invoices from Example Traders" }
  ]
}
```

**Client-side validation** (raises `WaValidationError` before any request, v0.1 §0 rule):

| Rule | Source |
|---|---|
| `name` matches `^[a-z0-9_]+$`, ≤ 512 | F-104 |
| body text ≤ 1024; footer ≤ 60 | F-044, F-045 |
| Placeholders in `body.text`: named must match `^[a-z_]+$` and be unique; positional must be `{{1}}…{{n}}` in order with no gaps | F-042, F-043, F-049 |
| Exactly one example per placeholder, none extra; each example non-empty | F-108 |
| Body must not start or end with a placeholder ("dangling parameters") | F-049, F-122 (`2388299`) |
| `category` must be `UTILITY` | [lib] |
| `headerHandle` non-empty; **no length limit** (G-18) | F-107 |

**Not validated client-side** (the API decides): language support, duplicate name+language (F-104), words-to-parameters ratio (`2388293`), policy content (F-049, F-050), the 100-per-hour limit (F-105), the 250/6000 template cap (F-124, C-9).

> **Impact on v0.1 §7.** The v0.1 example body "`… Regards, {{signature}}`" ends with a parameter and would be rejected as a dangling parameter (F-049, `2388299`). The signature variable must sit inside the text and the body must end with static text, as above. The v0.1 text is an example only, but the README/JSDoc should not reuse it. Proposed v0.2 follow-up: tighten the JSDoc on `renderSignatureParameter`.

**Response:** `CreateTemplateResponseSchema = z.looseObject({ id: z.string(), status: z.string(), category: z.string() })` (F-106) → `CreateTemplateResult { templateId, status, category, raw }`.
- A utility template that contains marketing material is re-categorized (F-050, F-109), so the **returned `category` may not be `UTILITY`**. JSDoc tells callers to check it; the library does not throw [lib].
- A fresh template is `PENDING` (F-106) and cannot be sent until `APPROVED` (F-040). A decision can take up to 24 hours (F-116).

### 2.2 List — `GET /{v}/{waba-id}/message_templates` (F-110)

```ts
ListTemplatesInput = z.strictObject({
  fields: z.array(z.enum(TEMPLATE_FIELDS)).optional(),   // F-112 list; joined with ","
  limit: z.int().min(1).optional(),                      // F-110; no max known (G-10)
  after: z.string().min(1).optional(),                   // cursor
  before: z.string().min(1).optional(),
  status: z.string().min(1).optional(),                  // F-111, G-9: guide-only filter, passed through
}).optional();

ListTemplatesResult = { templates: WaTemplate[]; nextCursor?: string; previousCursor?: string; raw };
```

- `nextCursor` is `paging.cursors.after` when `paging.next` is present. The library **never follows the `paging.next` URL** (it is a Meta-supplied URL; the caller passes the cursor back instead) [lib].
- An empty `fields` array is rejected; omitting `fields` returns Meta's default fields (F-110).

### 2.3 Get status — `GET /{v}/{template-id}` (F-112)

```ts
GetTemplateInput = z.strictObject({ templateId: z.string().regex(/^[A-Za-z0-9_-]+$/),   // [lib] path-safe
                                    fields: z.array(z.enum(TEMPLATE_FIELDS)).optional() });
```
A status-only check sends `?fields=status` and returns `{ id, status }` (F-112).

### 2.4 Delete — `DELETE /{v}/{waba-id}/message_templates` (F-119, F-120)

```ts
DeleteTemplateInput = z.union([
  z.strictObject({ name: TemplateName }),                                        // all languages
  z.strictObject({ name: TemplateName, templateId: z.string().min(1) }),         // name + hsm_id → one language
  z.strictObject({ templateIds: z.array(z.string().min(1)).min(1).max(100) }),  // hsm_ids; never with name/hsm_id
]);
DeleteTemplateResponseSchema = z.looseObject({ success: z.boolean() });          // F-119; required [lib]
```
- Query: `name`, `hsm_id`, or `hsm_ids=<JSON array>` (`JSON.stringify` then URL-encoded) (F-119).
- JSDoc warns, from F-120: deleting by **name alone removes every language**; deleting an approved template blocks that name for 30 days; `DISABLED` templates cannot be deleted; the call needs `whatsapp_business_management` (else error `200`); one invalid id in `templateIds` fails the whole request; a template sent but not yet delivered goes to `PENDING_DELETION`.
- An unknown name raises `WaApiError` (G-13).

### 2.5 Shapes, states and rejection reasons

```ts
export const TEMPLATE_STATUSES = ["APPROVED","ARCHIVED","DELETED","DISABLED","IN_APPEAL",
  "LIMIT_EXCEEDED","PAUSED","PENDING","PENDING_DELETION","REJECTED"] as const;          // F-113
export const TEMPLATE_REJECTION_REASONS = ["ABUSIVE_CONTENT","CATEGORY_NOT_AVAILABLE",
  "INCORRECT_CATEGORY","INVALID_FORMAT","NONE","PROMOTIONAL","SCAM","TAG_CONTENT_MISMATCH"] as const; // F-114
export const TEMPLATE_QUALITY_SCORES = ["GREEN","RED","UNKNOWN","YELLOW"] as const;      // F-115

WaTemplateSchema = z.looseObject({
  id: z.string(), name: z.string().optional(), language: z.string().optional(),
  category: z.string().optional(), status: z.string().optional(),
  parameter_format: z.string().optional(), rejected_reason: z.string().optional(),
  quality_score: z.looseObject({ score: z.string().optional(), reason: z.string().optional(),
                                 reasons: z.array(z.string()).optional(), date: z.number().optional() }).optional(),
  components: z.array(z.looseObject({})).optional(), last_updated_time: z.number().optional(),
});
```
Status, category and reason are plain strings in the schema (D-9, same spirit as v0.1 D-1): Meta's own lists already differ between pages (the webhook has `FLAGGED`, `LOCKED`, `REINSTATED`, F-117; the REST enum does not, F-113). Exported type guards `isKnownTemplateStatus(s)` etc. narrow when needed.

**Review states (what each means for the SaaS)**

| Status | Sendable? | Notes |
|---|---|---|
| `PENDING` | no | Under review; up to 24 h (F-116) |
| `APPROVED` | **yes** | The only sendable state (F-040) |
| `REJECTED` | no | See reasons; edit and resubmit, or appeal (F-116); edit is out of scope here (C-10) |
| `PAUSED` | no | Quality-driven (F-118 `FIRST_PAUSE`/`SECOND_PAUSE`/`RATE_LIMITING_PAUSE`); send error `132015` (F-051) |
| `DISABLED` | no | Quality-driven; cannot be deleted (F-120); `132016` on send (F-051) |
| `IN_APPEAL` | no | Appeal requested (F-117) |
| `ARCHIVED` / `PENDING_DELETION` / `DELETED` | no | Inactivity archive (F-125) or deletion (F-120) |
| `LIMIT_EXCEEDED` | no | WABA at its template limit (F-117, F-124) |

**Rejection reasons** (`rejected_reason`, F-114): `ABUSIVE_CONTENT`, `PROMOTIONAL`, `SCAM` (policy); `INCORRECT_CATEGORY`, `TAG_CONTENT_MISMATCH` (category mismatch); `INVALID_FORMAT` (format; the webhook then adds `rejection_info.{reason, recommendation}`, F-118, G-12); `NONE` (no reason; also used for approvals and pauses); `CATEGORY_NOT_AVAILABLE` (deprecated, authentication only). Common causes from the review page (F-049, F-116): special characters like `#`, `$`, `%` in parameters, non-sequential or mismatched placeholders, too many parameters for the length, dangling parameters, duplicate wording of an existing template, content breaching the Commerce or Business Policy.

---

## 3. Media (F-130–F-136)

Added to `WaClient` (phone-number scoped). Media ids come from `uploadMedia` (v0.1 §4) or from inbound-media webhooks (F-135).

### 3.1 Get URL — `GET /{v}/{media-id}?phone_number_id=…`

```ts
GetMediaUrlInput = z.strictObject({ mediaId: z.string().regex(/^[A-Za-z0-9_-]+$/) });   // [lib] path-safe
GetMediaUrlResponseSchema = z.looseObject({ id: z.string(), url: z.url({ protocol: /^https$/ }),
  mime_type: z.string().optional(), sha256: z.string().optional(), file_size: z.string().optional(),
  messaging_product: z.string().optional() });                                          // F-130
GetMediaUrlResult = { mediaId, url, mimeType?, sha256?, fileSize?: number, raw }
```
- `phone_number_id` is always sent, set to the client's `phoneNumberId` [lib]: Meta then answers only if the media belongs to that number (F-130), which stops one tenant's id resolving through another tenant's client.
- JSDoc: the URL is valid **5 minutes** (F-131); a plain GET without a token does not return the file (F-131).
- `fileSize` is parsed from the string Meta sends (F-130); a non-numeric value leaves it `undefined` [lib].

### 3.2 Download — GET the media URL with auth (F-132)

```ts
DownloadMediaInput = z.strictObject({
  url: z.url(),
  allowedMediaHosts: z.array(z.string().regex(/^[a-z0-9.-]+$/)).min(1).optional(),  // default: DEFAULT_MEDIA_HOSTS
  maxBytes: z.int().positive().optional(),                                          // default 100_000_000 (F-063, G-8)
});
export const DEFAULT_MEDIA_HOSTS = ["lookaside.fbsbx.com"] as const;                // F-133, G-16
DownloadMediaResult = { body: Blob; contentType: string | null; size: number }
```

**Token-safety rule (D-8).** The `Authorization` header is sent **only if** the URL (and every redirect hop) passes all of:
1. `protocol === "https:"`;
2. `hostname` (lower-cased) is **exactly** one of `allowedMediaHosts` (default `["lookaside.fbsbx.com"]`, F-133); no wildcards or suffix matching;
3. no `username`/`password` in the URL; port empty or `443`.

Otherwise the call throws `WaValidationError` **before any request is sent** and the token is never placed on a request. The error message names the rejected hostname only (no query string, no token) [lib].

**Mechanics [lib]:**
- `fetch(url, { headers: { Authorization }, redirect: "manual" })`. A 3xx is followed by the library only after the `Location` target passes the same three checks, at most 3 hops; an off-list redirect throws `WaValidationError` and no token is sent to it.
- 2xx: stream the body, enforcing `maxBytes` (also checked against `Content-Length`); over the limit → the stream is cancelled and a `WaValidationError` with the issue "media larger than maxBytes" is thrown.
- Non-2xx: JSON Graph envelope → `WaApiError`, else `WaHttpError`. For `404` the JSDoc repeats Meta's advice: fetch a **new** media URL and retry; if that fails, renew the token (F-132). The library does not retry (v0.1 non-goal).
- `contentType` comes from the response header (F-132); the Blob carries it.

**Why a default allow-list rather than "any https":** the URL is data returned by Meta (or lifted from a webhook payload); sending the token to an arbitrary host would leak it if a payload were forged or a response tampered with. The docs show only one host, and only for the webhook `url` field (G-16); if Meta serves media from another host the call fails closed and the caller opts in explicitly via `allowedMediaHosts`.

**Convenience [lib]:** `downloadMediaById({ mediaId })` = `getMediaUrl` then `downloadMedia` with defaults. No automatic retry.

### 3.3 Delete — `DELETE /{v}/{media-id}?phone_number_id=…` (F-134)

```ts
DeleteMediaInput = z.strictObject({ mediaId: z.string().regex(/^[A-Za-z0-9_-]+$/) });
DeleteMediaResponseSchema = z.looseObject({ success: z.boolean() });   // F-134
```
- `phone_number_id` is sent as in §3.1.
- No request body and no `Content-Type` (the guide's example sends none; the reference lists the header as required, C-11, unverified).
- JSDoc: uploaded media persists 30 days unless deleted earlier (F-136); webhook media ids are downloadable for 7 days (F-062).

---

## 4. Errors

All v0.1 classes (v0.1 §5) are reused. One category is added:

```ts
export type WaErrorCategory = /* v0.1 values */ | "template_creation";

export function waErrorCategory(code: number, subcode?: number): WaErrorCategory;
```

**`template_creation`** (D-7) covers these identifiers from the "Template creation errors" table (F-122), plus the duplicate-name subcode (F-104):
`2388024`, `2388039`, `2388040`, `2388047`, `2388072`, `2388073`, `2388293`, `2388299`.

- They are listed on the error page as codes (F-122), but the template guide describes `2388024` as a **subcode** of code `100` (F-104), and F-071 says subcodes are deprecated and not returned from v16.0 (G-17). So the function matches the identifier against **either** `code` or `subcode`; `WaApiError.category` passes both. If neither matches, the category is the v0.1 code-based one (so a bare `100` stays `parameter`).
- **Not included:** `132018` (the docs put it under send-time errors, F-123) and `2388019` (listed under "Send template errors", F-122; see Q-1).
- This is a deliberate exception to "categorize by Graph `code` only" (F-071); CLAUDE.md should be amended to match (Q-2).
- Table-driven tests extend v0.1 test 19.

---

## 5. Webhook: template status events (F-117, F-118, F-161)

`parseWebhookPayload` (v0.1 §6.3) today counts any non-`messages` change in `skippedChanges`. v0.2 maps `field === "message_template_status_update"`:

```ts
export type WaTemplateStatusEvent = {
  kind: "template_status";
  wabaId: string;                    // entry[].id
  eventTime?: number;                // entry[].time
  templateId: string;                // integer on the wire (F-117) → string (G-15)
  templateName: string; templateLanguage: string;
  event: string; knownEvent: boolean;            // F-117 list in TEMPLATE_STATUS_EVENTS; D-9
  reason: string | null;                         // null when scheduled for deletion (F-117)
  category?: string;                             // MARKETING | UTILITY | AUTHENTICATION
  disableDate?: number;                          // disable_info.disable_date (F-118)
  other?: { title: string; description?: string };       // pause/unpause (F-118)
  rejection?: { reason: string; recommendation?: string }; // INVALID_FORMAT only (F-118, G-12)
};
```
- `WaWebhookEvent` gains this variant. It has no `phoneNumberId` (the payload has no `metadata`), so it is a separate shape, not an extension of `Base`. Exhaustive `switch` users get a compile error on upgrade: a **minor-version** change under 0.x, flagged in the changeset.
- **Routing:** template webhooks always go to the app's default callback; per-WABA/phone overrides do not apply to them (F-161). The tenant is identified by `wabaId` only.
- **Dedupe guidance (README):** the payload has no unique id; use `wabaId:templateId:event:eventTime` [lib]. Retries can duplicate deliveries (F-083, F-084).
- A rejected template should be surfaced to the tenant with `reason` and, when present, `rejection.recommendation`.

---

## 6. `examples/` plan

Not shipped in the npm package (`files: ["dist"]` is unchanged). Each example is a single file a reader can copy. They use only the fake values from CLAUDE.md and read secrets from environment variables, never literals.

```
examples/
  README.md                       # how to run, what each shows, the fake-value rule
  tsconfig.json                   # extends ../tsconfig.json; paths: "wa-cloud-kit" → ../src/index.ts
  webhook-handler/server.ts       # §6.1
  send-invoice/send-invoice.ts    # §6.2
  send-invoice/invoice-template.json   # the create body from §2.1, for use with createTemplate
```
Run with Node ≥22.18's built-in type stripping (`node server.ts`), no extra tooling [lib]. Whether 22.22.2 runs `.ts` files unflagged and honours the `paths` mapping must be verified when implementing (Q-4); the fallback is `pnpm build` and a relative import of `dist/`. `pnpm check` must lint and typecheck `examples/` (add to `tsconfig.json` `include` and to the ESLint project service), and a test asserts the hygiene scan also covers `examples/`.

### 6.1 Minimal webhook handler (Node, `node:http` only)

| Step | Behaviour | Source |
|---|---|---|
| Raw body | Collect request chunks into one `Uint8Array`; **never** `JSON.parse`/re-serialize before the signature check | F-082, CLAUDE.md |
| Size cap | Reject bodies over 3 MB with `413` before verifying | F-084 |
| `GET` challenge | `verifyWebhookChallenge(url.searchParams, WA_VERIFY_TOKEN)`; `ok` → `200` with the challenge as plain text; else `403` | F-080, F-081, C-2 |
| `POST` signature | `verifyWebhookSignature({ rawBody, signatureHeader: req.headers["x-hub-signature-256"], appSecret })`; `false` → `401` (the docs give no status for a bad signature [lib]) | F-082 |
| Acknowledge | After a valid signature, parse, respond `200` **immediately**, then process | F-083 |
| Dedupe | Keep seen keys in a bounded in-memory `Map` (size cap, oldest evicted): `message.id` for messages; `status.id + ":" + status` for statuses; the §5 key for template events. Comment in the code: this is demo storage only; production needs shared storage because deliveries are retried for 7 days and may duplicate | F-083, F-084, C-1 |
| Tenant routing | Log `wabaId` / `phoneNumberId` from the parsed event to show which tenant it belongs to | F-085, F-117 |
| Config | `WA_APP_SECRET`, `WA_VERIFY_TOKEN`, `PORT` from `process.env`; exit with a clear message if unset. Never print them | CLAUDE.md |

*Multi-tenant note in the example's comments [lib inference]:* the signature key is the app secret (F-082); a Tech Provider onboards all clients through one app (F-157), so one secret and one callback URL serve every tenant. Verify this against the app configuration before relying on it.

### 6.2 "Send invoice PDF" (upload → utility template with document header + signature)

1. Read tenant config from env (`WA_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_WABA_ID`, `WA_API_VERSION`) and CLI args (PDF path, recipient in the fictional `+1555…` range for the sample).
2. `createWaBusinessClient(...).getTemplate({ templateId })` with `fields: ["status"]`; stop unless `APPROVED` (F-040). (Template creation itself is shown separately via `invoice-template.json`; it needs a caller-obtained `headerHandle`, D-6.)
3. `uploadMedia({ file: new Blob([bytes], { type: "application/pdf" }), mimeType: "application/pdf", filename })` → `mediaId` (v0.1 §4; F-060, F-061, F-063).
4. `renderSignatureParameter({ signature, parameterName: "signature" })` (v0.1 §7).
5. `sendTemplate({ to, name: "invoice_with_pdf", languageCode: "en_US", header: { document: { id: mediaId } }, body: { format: "named", parameters: [customer_name, invoice_number, amount, due_date, signature] } })` (v0.1 §3.4; F-046).
6. Print the `messageId`. Comment: success means *accepted*, not delivered; follow the `messages` webhook for status (F-012).

Note the two different "media" values: at **creation** the header needs an example handle (F-107); at **send** the header carries the real PDF's media `id` (F-046). They are not interchangeable (C-8).

---

## 7. Multi-tenant note (facts only, no implementation)

### 7.1 What a SaaS needs per client

| Item | Where it comes from (Meta docs) | Used for |
|---|---|---|
| **WABA ID** | Returned by Embedded Signup's session event (`waba_id`) or an API request (F-156) | `{WABA-ID}` in template calls (F-100); identifies the tenant in webhooks as `entry[].id` (F-085, F-117) |
| **Phone number ID** | Same event (`phone_number_id`) (F-156) | `{Phone-Number-ID}` in send and media upload (F-001, F-060); `value.metadata.phone_number_id` in webhooks (F-085) |
| **Access token** | A **business token**, "scoped to individual onboarded customers", obtained by exchanging the Embedded Signup code (F-152, F-157). Direct (non-partner) developers use a system-user token instead (F-152) | `Authorization: Bearer` on every call (F-002). Lifetime/revocation of business tokens: not stated (G-19) |
| Business portfolio ID | Session event `business_id` (F-156) | Informational |
| Billing | The client adds its own payment method; Meta bills the client (F-150, F-160) | Needed before the client can send (F-160) |

The library needs only the first three (the token plus the two ids). **Where the token is stored and rotated is the SaaS's decision**; the library never persists one (v0.1 §8).

### 7.2 Roles, per Meta

- Meta distinguishes **Solution Partners**, **Tech Providers** and **Tech Partners** — "businesses that provide, or want to provide, WhatsApp messaging services to other businesses" (F-150, F-151). Tech Providers have no credit line; clients pay Meta directly (F-150). An app "that will not be used by other businesses" is directed to the ordinary Cloud API guide instead (F-151). Which path fits the SaaS is the maintainer's business decision; this note only records what the pages say.
- **Becoming a Tech Provider** (F-155): business verification → App Review with videos (a message sent from the app; a template created) → **Advanced access** to `whatsapp_business_messaging` and `whatsapp_business_management`. Without Advanced access, calls on WABAs the business does not own return error `200` (F-154), and the permissions do not appear in the signup flow.
- **Which permission does what** (F-154): `whatsapp_business_management` for WABA settings and templates (every §2 call; F-120); `whatsapp_business_messaging` for phone-number settings, sending and receiving (every §3 call; F-135).

### 7.3 Embedded Signup, per Meta

- Customers go through a Meta-hosted flow launched from the partner's site; it creates or selects the portfolio, WABA and phone number and grants the app access (F-156). Customers **own** their assets and keep full WhatsApp Manager access, which the partner cannot restrict (F-158). Numbers can only be registered for Cloud API; a WABA created through the developer app cannot be onboarded this way (F-158).
- After the flow the partner's **server** (not the browser) must: exchange the code (`GET /oauth/access_token`), subscribe the app to the WABA (`POST /{WABA-ID}/subscribed_apps`), and register the number (`POST /{PHONE-NUMBER-ID}/register` with a 6-digit PIN). Until then the customer cannot use the app (F-157).
- Limits: 10 new customers per rolling 7 days by default, 200 after Business Verification, App Review and Access Verification (F-159).
- **Versions:** v4 is the latest; v2 is "deprecated on October 15, 2026" (already past as of this spec's date) and v2/v3 run until October 2026 (F-162). Any integration must target v4.

### 7.4 Webhooks across tenants

- One app callback URL receives every tenant's events by default; Meta can route `messages` (and some other fields) per phone number or WABA instead (phone number first, then WABA, then app) via `override_callback_uri` + `verify_token` on `subscribed_apps` (F-161).
- **Template and account-level webhooks cannot be overridden**: they always go to the app's default URL (F-161). A SaaS that routes message webhooks per tenant still needs the default URL to accept template events for all tenants and route them by `wabaId` (§5).
- The signature check uses the app secret (F-082). Whether one secret covers all tenants follows from them sharing one app (§6.1 note).

---

## 8. Tests (Vitest; no network; fake fetch; `pnpm test`)

Fake values: v0.1 §9 plus WABA `"200000000000002"`, template id `"300000000000003"`, media id `"400000000000004"`, handle `"test-header-handle"`, download host `lookaside.fbsbx.com`.

**Templates**
45. `createTemplate` emits exactly the §2.1 body (snapshot): uppercase enums, `parameter_format: "NAMED"`, `body_text_named_params`, `header_handle`; `POST …/200000000000002/message_templates`, Bearer header.
46. Positional bodies emit `body_text: [[…]]` and `parameter_format: "POSITIONAL"`.
47. Rejected with no request sent: bad name (uppercase, space, 513 chars), body 1025 chars, footer 61, duplicate named placeholder, positional gap, example count mismatch, body starting/ending with a placeholder, non-UTILITY category, empty `headerHandle`, unknown key (strict).
48. A 1024-char body and a 512-char name are accepted; a very long `headerHandle` is accepted (G-18).
49. Create response parses; a returned `category: "MARKETING"` is passed through without throwing.
50. `listTemplates`: `fields`, `limit`, `after`, `status` serialized; `nextCursor` taken from `paging.cursors.after` only when `paging.next` exists; `paging.next` is never fetched.
51. `getTemplate` with `fields: ["status"]` → `?fields=status`; path-unsafe ids rejected.
52. `deleteTemplate`: by name; by name+id (`hsm_id`); by ids (`hsm_ids=[…]` JSON, 100 ok, 101 rejected, empty rejected); mixing `name` with `templateIds` rejected; `{success:true}` parses; missing `success` → `WaResponseShapeError`.
53. Unknown status / reason / category strings parse; `isKnownTemplateStatus` narrows.
54. A 400 envelope with `error_subcode: 2388299` → `WaApiError.category === "template_creation"`; code `2388040` likewise; `2388024` as subcode of `100` likewise; plain `100` stays `parameter`; `132018` and `2388019` are **not** `template_creation`.

**Media**
55. `getMediaUrl` hits `GET …/400000000000004?phone_number_id=100000000000001`; response parses; `file_size` string → number; non-https `url` → `WaResponseShapeError`.
56. `downloadMedia` sends `Authorization: Bearer test-token` to an allowed https host and returns a Blob with the response content type.
57. **Token safety** — each of these throws `WaValidationError` and the fake fetch records **zero calls**: `http://` URL; host not on the list; look-alike hosts (`lookaside.fbsbx.com.evil.test`, `evil-lookaside.fbsbx.com`, `sub.lookaside.fbsbx.com`); URL with credentials; port `8443`.
58. Redirect handling: a 302 to an allowed host is followed once with the token; a 302 to another host throws and the token is never sent to it (fake fetch asserts on every recorded call); more than 3 hops throws.
59. A caller-supplied `allowedMediaHosts` replaces the default; entries with scheme, wildcard, port or uppercase-invalid characters are rejected.
60. `maxBytes`: a `Content-Length` over the limit, and a stream that exceeds it without a header, both abort and cancel the stream.
61. A `404` with a Graph envelope → `WaApiError`; an HTML `404` → `WaHttpError`; the error message contains no token and no query string.
62. `deleteMedia` → `DELETE` with `phone_number_id`, no body and no `Content-Type`; `{success:true}` parses.

**Webhook**
63. A `message_template_status_update` change maps to `kind: "template_status"` (approved; rejected with `INVALID_FORMAT` + `rejection_info`; disabled with `disable_info`; pause with `other_info`; `reason: null`). Integer template id becomes a string.
64. An unknown `event` string parses with `knownEvent: false`. `skippedChanges` still counts other unknown fields.

**Hygiene / shape**
65. The hygiene scan covers `examples/`; `examples/` typechecks and lints under `pnpm check`.
66. Package-shape test unchanged: still no runtime deps, ESM only, named exports only.

---

## 9. Stop conditions

Unchanged from v0.1 §10 / CLAUDE.md. Status for this spec:
- (1) **Hit and resolved:** the Graph Resumable Upload guide has no Markdown page (G-11). Resolved by D-6; it is not needed.
- (2)/(3) Gaps and conflicts recorded: `G-9`–`G-19`, `C-6`–`C-11`. None blocks the spec; **C-6, C-11 and G-17 must be checked against a real response before release**, which cannot happen under stop condition 5 without a real token. They are called out for the maintainer.
- (4) No existing page hash changed (all 30 v0.1 sources re-fetched and matched before extending excerpts).
- (5), (6), (7) Not triggered; this branch adds no code.

---

## 10. Decisions and open questions

| ID | Decision | Affects |
|---|---|---|
| D-6 | The caller supplies `header_handle`; v0.2 does not wrap the Resumable Upload API (maintainer, 2026-10-16) | §0, §2.1, §6.2, C-8, G-11 |
| D-7 | New error category `template_creation` for the `2388xxx` template-creation identifiers; matched on `code` or `error_subcode`; `132018` excluded (maintainer, 2026-10-16) | §4, tests 54 |
| D-8 | `downloadMedia` sends the token only to an `https` URL whose hostname is on the allow-list (default: the host shown in Meta's docs, `lookaside.fbsbx.com`, F-133); otherwise `WaValidationError` and nothing is sent; every redirect hop is checked (maintainer, 2026-10-16) | §3.2, tests 56–59 |
| D-9 | Template status, category, rejection reason and webhook event are strings with exported known-value lists and type guards, never rejecting unknown values *(proposed)* | §2.5, §5, tests 53, 64 |

**Open questions for the maintainer**
- **Q-1.** `2388019` ("template limit exceeded") is raised when creating a template but is filed under "Send template errors" (F-122). Include it in `template_creation`?
- **Q-2.** D-7 departs from CLAUDE.md's "categorize by Graph `code` only (F-071)". Amend that line to allow the listed template-creation identifiers on `error_subcode`?
- **Q-3.** C-6 (uppercase component and category enums) follows the reference, while Meta's create guides show lowercase. Both are likely accepted, but no page says so. OK to ship uppercase and verify with your first real call?
- **Q-4.** Examples runtime (§6): rely on Node's built-in type stripping, or build first and import from `dist/`?
