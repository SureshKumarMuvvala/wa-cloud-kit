# wa-cloud-kit — v0.2 specification

**Status:** Implemented on branch `track-wa/v0.2` (minor release). Q-1–Q-4 answered 2026-10-16 (D-10–D-13). Everything that needs Meta's live API is open in §10 and must be run before tagging v0.2.0.
**Builds on:** [`wa-cloud-kit.md`](wa-cloud-kit.md) (v0.1, implemented). Section numbers here are independent; v0.1 sections are cited as "v0.1 §n".
**Facts:** every Meta behaviour cites an ID in [`docs/facts.md`](../facts.md). New IDs in this spec: `F-100`–`F-125` (templates), `F-130`–`F-136` (media), `F-150`–`F-162` (multi-tenant), conflicts `C-6`–`C-12`, gaps `G-9`–`G-20`. All were retrieved on 2026-10-16. A behaviour without an ID is a library choice, labelled **[lib]**.

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

A body with no parameters is written `body: { text }` with no `format` and no `examples`, and `parameter_format` is then omitted [lib]. (The sketch above shows the parameterized forms.)

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

> **Impact on v0.1 §7.** The v0.1 example body "`… Regards, {{signature}}`" ends with a parameter and would be rejected as a dangling parameter (F-049, `2388299`). Fixing it is build task **B-1** (§9, D-14).

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
- **Not included:** `132018` (the docs put it under send-time errors, F-123) and `2388019` (Meta files it under "Send template errors", F-122; D-10, G-20).
- This is a deliberate, narrow exception to "categorize by Graph `code` only" (F-071). CLAUDE.md is amended in this change to say exactly that, and nothing wider (D-11): no other subcode is ever matched.
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
  tsconfig.json                   # extends ../tsconfig.json; "wa-cloud-kit" → ../dist (build first, D-13)
  webhook-handler/server.ts       # §6.1
  send-invoice/send-invoice.ts    # §6.2
  send-invoice/invoice-template.json   # the create body from §2.1, for use with createTemplate
```
**Build first, import from `dist/` (D-13).** Examples are plain `.ts` files that `import ... from "wa-cloud-kit"`, resolved to the built package output: `examples/tsconfig.json` maps `wa-cloud-kit` to `../dist/index.js` (types from `../dist/index.d.ts`), and `examples/README.md` says to run `pnpm build` first. They are compiled with the same `tsc` toolchain (an `examples:build` step emitting to a git-ignored directory) and run with `node`; no type-stripping flag, no extra tooling. `pnpm check` builds the package, then typechecks and lints `examples/` against `dist/`, so an example cannot drift from the public API; a test asserts the hygiene scan also covers `examples/`.

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
54. A 400 envelope with `error_subcode: 2388299` → `WaApiError.category === "template_creation"`; code `2388040` likewise; `2388024` as subcode of `100` likewise; plain `100` stays `parameter`; `132018` and `2388019` are **not** `template_creation`; a non-listed subcode (e.g. `2388103`, `33`) never changes the category.

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

## 9. Build tasks beyond the new APIs

**B-1 — remove the dangling-parameter example (D-14).** Meta rejects a template that starts or ends with a parameter (F-049, `2388299`). v0.1 shows exactly that, so:
1. Edit **v0.1 spec §7** (`wa-cloud-kit.md`, line "for example a body like `… Regards, {{signature}}`") to an example whose body ends in static text, e.g. `… For any questions contact {{signature}}. Thank you.`, with a one-line pointer to F-049.
2. Audit and fix **README.md** and the JSDoc in `src/signature/render.ts` (`renderSignatureParameter`, `assertTemplateBodyLength`) so no example or comment shows a template body that starts or ends with a parameter. (A search shows none in the README today; the audit confirms it and the new test below keeps it that way.)
3. Fix the existing fixtures in `test/signature/render.test.ts` that use bodies ending in `{{signature}}` / `{{3}}` (the `Regards, …` strings around lines 108–111 and 170) so they end in static text. Their length arithmetic is updated to match.
4. **New test:** the documentation example for `renderSignatureParameter` (the example template body in its JSDoc and in README) is extracted and asserted not to start or end with a placeholder (`^\{\{` / `\}\}$` after trimming). A second assertion runs the same check on the §2.1 invoice body used by `createTemplate` tests, so a docs example and the validator cannot disagree.
5. `assertTemplateBodyLength` stays a length check only; it does not enforce F-049 (that is `createTemplate`'s job, §2.1).
6. Changeset: patch (docs and test fixtures only).

## 10. Verify on first live call

Nothing below can be checked in this repo: tests use a fake `fetch` and CLAUDE.md forbids a real token (stop condition 5). Each item is run once, by the maintainer, with a real **test** WABA and number, before tagging v0.2.0. Record the outcome in `docs/facts.md` (turn the row into a confirmed fact or a C-row) and fix the code in the same change.

| # | Item | How to check | Pass | If it fails |
|---|---|---|---|---|
| V-1 | **C-6** uppercase `category`, `parameter_format`, component `type`/`format` | `createTemplate` with the §2.1 invoice body | `200` with `{id, status: "PENDING", category}` | Switch the emitted enums to lowercase (the guides' form) in one place, update tests and C-6 |
| V-2 | **C-11** media `DELETE` with no body and no `Content-Type` | `deleteMedia` on an uploaded test file | `{success: true}` | Send `Content-Type: application/json` (and an empty JSON body if needed); update C-11 |
| V-3 | **G-17** where the `2388xxx` identifier arrives | `createTemplate` with an invalid body (e.g. a body ending in a placeholder, `2388299`) and a duplicate name+language (`2388024`) | `WaApiError.category === "template_creation"` and note whether the value is in `code` or `error_subcode` | If it is in neither field, the category cannot be derived: revert D-7/D-11 and use the message text only as documentation |
| V-4 | **C-8 / G-18** a caller-supplied `header_handle` is accepted for a DOCUMENT header | `createTemplate` with a handle from the Resumable Upload API (obtained outside the library); also try a handle >60 chars | Accepted | Document the exact handle source; add the length rule if one is enforced |
| V-5 | **F-107** DOCUMENT header creation shape. Meta's creation examples show IMAGE only; the DOCUMENT form is inferred from "the syntax … is the same for all media types" | Same call as V-4 | Created and later `APPROVED` | Adjust the component shape |
| V-6 | **G-16** host of the `GET /{media-id}` `url` | `getMediaUrl` then `downloadMedia` on an uploaded PDF | URL hostname is `lookaside.fbsbx.com` | Add the real host to `DEFAULT_MEDIA_HOSTS` with its own F-id (never widen to a wildcard) |
| V-7 | **F-130** `phone_number_id` check on `GET /{media-id}` and `DELETE` | Request a media id with another number's `phone_number_id` | Meta refuses | Document that tenant isolation relies on token scope only |
| V-8 | **G-9** `status=` list filter | `listTemplates({status: "approved"})` | Only approved templates | Remove the option or filter client-side |
| V-9 | **G-10** list `limit` maximum and `fields` handling | `limit` of 100 and 1000; `fields: ["status"]` | Accepted or a clear error | Document the maximum as a new F-id |
| V-10 | **G-13** error for deleting an unknown name | `deleteTemplate({name: "does_not_exist"})` | A Graph envelope (`WaApiError`) | If it is not an envelope, `WaHttpError` covers it; record the code |
| V-11 | **G-14** a business token (not a system-user token) can call template and media endpoints | Run V-1…V-10 with an Embedded-Signup business token as well | Same results | Document the required token type per call |
| V-12 | **F-050 / F-109** invoice wording stays `UTILITY` | Check the returned `category` of V-1; try the exact production invoice text | `UTILITY` | Reword; or if re-categorized, treat as marketing (pricing, F-095/F-096) |
| V-13 | **F-117 / G-15** `message_template_status_update` delivery, integer `message_template_id`, `entry.time` | Subscribe the app, create then delete a test template | Event arrives at the app's default URL with the documented shape | Adjust the parser and fixtures |
| V-14 | **F-161** template webhooks ignore a WABA `override_callback_uri` | Set an override on the test WABA, trigger a template event | Event still goes to the app default URL | Update §5/§7.4 |
| V-15 | **F-132** download with `Authorization` works and a missing token fails | `downloadMedia` and a plain `curl` of the URL | Token: 200 binary; no token: failure | Update F-131/F-132 |
| V-16 | **F-082 + shared secret** one app secret verifies webhooks for every onboarded tenant | Deliver a webhook for a second test WABA | `verifyWebhookSignature` passes with the same secret | Remove the §6.1 multi-tenant comment; document per-tenant secrets |
| V-17 | Language code form: `en_US` at creation (F-104 guide) vs `en-US` in webhooks (F-117) | Create with `en_US`; read the webhook | Documented mapping holds | Normalize in the parser and note it |
| V-18 | **C-12** type of `disable_info.disable_date` | Disable a test template and read the event | A number or numeric string, exposed as `disableDate` | Adjust the parser and fixtures |

## 11. Stop conditions

Unchanged from v0.1 §10 / CLAUDE.md. Status for this spec:
- (1) **Hit and resolved:** the Graph Resumable Upload guide has no Markdown page (G-11). Resolved by D-6; it is not needed.
- (2)/(3) Gaps and conflicts recorded: `G-9`–`G-20`, `C-6`–`C-12`. None blocks the spec; everything that needs a real response is collected in §10 (cannot be done here: stop condition 5).
- (4) No existing page hash changed (all 30 v0.1 sources re-fetched and matched before extending excerpts).
- (4) At implementation time the one page whose excerpt was extended (`tpl-status-webhook`) was re-fetched and its sha256 still matched the manifest.
- (5), (6), (7) Not triggered. The `check` script now builds and typechecks `examples/` as well (§6); CLAUDE.md's gate line says so.

---

## 12. Decisions

| ID | Decision | Affects |
|---|---|---|
| D-6 | The caller supplies `header_handle`; v0.2 does not wrap the Resumable Upload API (maintainer, 2026-10-16) | §0, §2.1, §6.2, C-8, G-11 |
| D-7 | New error category `template_creation` for the `2388xxx` template-creation identifiers; matched on `code` or `error_subcode`; `132018` excluded (maintainer, 2026-10-16) | §4, test 54 |
| D-8 | `downloadMedia` sends the token only to an `https` URL whose hostname is on the allow-list (default: the host shown in Meta's docs, `lookaside.fbsbx.com`, F-133); otherwise `WaValidationError` and nothing is sent; every redirect hop is checked (maintainer, 2026-10-16) | §3.2, tests 56–59 |
| D-9 | Template status, category, rejection reason and webhook event are strings with exported known-value lists and type guards, never rejecting unknown values *(proposed; unchanged)* | §2.5, §5, tests 53, 64 |
| D-10 | `2388019` stays where Meta files it (send-template errors): it is **not** `template_creation`. Recorded as G-20 (maintainer, 2026-10-16; was Q-1) | §4, G-20, test 54 |
| D-11 | CLAUDE.md is amended with one narrow exception to "categorize by `code` only": `error_subcode` may be matched only for the documented `2388xxx` template-creation group, citing F-104, F-122, G-17 (maintainer, 2026-10-16; was Q-2). Done in this change | §4, `CLAUDE.md` |
| D-12 | Ship uppercase enums (C-6) and verify them on the first live call. All unverified items are tracked in §10 (maintainer, 2026-10-16; was Q-3) | §2.1, §10, C-6 |
| D-13 | Examples build first and import from `dist/` (maintainer, 2026-10-16; was Q-4) | §6 |
| D-14 | The v0.1 dangling-parameter signature example is fixed as a v0.2 build task (B-1, §9) (maintainer, 2026-10-16) | §9, v0.1 §7 |
