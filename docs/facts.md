# Facts register

Every API shape, limit, policy, error code and version that wa-cloud-kit relies on is listed here with its source. Nothing in `src/` may encode a Meta fact that does not have an F-id below.

- **All facts were retrieved on 2026-10-16** unless a row says otherwise.
- **Base** = `https://developers.facebook.com/documentation/business-messaging/whatsapp/` (raw `.md` pages; index at `…/whatsapp/llms.txt`).
- **Excerpts:** each "Excerpt" column points at `sources/<slug>.md`, which holds the verbatim lines. `sources/manifest.json` holds the URL, byte count and sha256 of each raw response.
- **Updating a fact:** re-fetch the page, update the excerpt, the manifest and this table, and bump the retrieval date on the row.

## Transport, auth, versions

| ID | Fact | Source URL | Excerpt |
|---|---|---|---|
| F-001 | Send endpoint is `POST /{Version}/{Phone-Number-ID}/messages`. Host is `https://graph.facebook.com`. | Base`reference/whatsapp-business-phone-number/message-api.md` | message-api |
| F-002 | Auth header is `Authorization: Bearer <token>`. | Base`access-tokens.md` | access-tokens |
| F-003 | Access tokens are opaque: "Do not parse, decode, or make assumptions about the format". They are variable length. | Base`access-tokens.md` | access-tokens |
| F-004 | Graph API versions (release → expiry): v26.0 Jul 29 2026 → TBD; v25.0 Feb 18 2026 → Jul 29 2028; v24.0 Oct 8 2025 → Feb 18 2028; v23.0 May 29 2025 → Oct 8 2027. The page also has a separate Marketing API table, whose v25.0 row reads TBD. | https://developers.facebook.com/docs/graph-api/changelog/versions | graph-versions |
| F-005 | "The latest Graph API version is v26.0". "Each version is guaranteed to operate for at least two years." An unversioned call uses the version set in the app dashboard, and Meta recommends always specifying the version. | https://developers.facebook.com/docs/graph-api/guides/versioning | graph-versioning |
| F-006 | WhatsApp guide examples use `v25.0`. Several template pages still show `v23.0`. | Base`messages/text-messages.md`, `templates/overview.md` | text-messages, templates-overview |
| F-007 | Throughput defaults to 80 mps per business phone number. Exceeding it returns error `130429`. A pair rate limit applies when sending to the same user. | Base`throughput.md` | throughput |

## Send messages

| ID | Fact | Source URL | Excerpt |
|---|---|---|---|
| F-010 | Required request fields are `messaging_product`, `recipient_type` (`"individual"` or `"group"`), `to` and `type`. `context.message_id` is optional and makes the message a reply. | Base`reference/whatsapp-business-phone-number/message-api.md` | message-api |
| F-011 | The response has `messaging_product`, `contacts[{input, wa_id}]` and `messages[{id, message_status?}]`. `message_status` is one of `accepted`, `held_for_quality_assessment` or `paused`. It is only present for templates that are being paced. | message-api.md; Base`messages/send-messages.md` | message-api, send-messages |
| F-012 | A success response means the request was accepted, not delivered. Delivery is reported through the `messages` webhook. | Base`messages/send-messages.md` | send-messages |
| F-013 | If the leading `+` is omitted from `to`, the business number's country calling code is prepended. Meta recommends including both the `+` and the country code. | Base`messages/send-messages.md` | send-messages |
| F-014 | Delivery order is not guaranteed to match request order. | Base`messages/send-messages.md` | send-messages |
| F-015 | A media `link` is cached by Meta for 10 minutes. | Base`messages/send-messages.md` | send-messages |
| F-016 | A media object needs exactly one of `id` or `link`. | message-api.md; Base`messages/document-messages.md` | message-api, document-messages |
| F-020 | Text: `text.body` is required, "Maximum 4096 characters". `text.preview_url` is an optional boolean. Link-preview URLs must begin with `http://` or `https://`. | Base`messages/text-messages.md` | text-messages |
| F-021 | Document: `document.id` or `document.link`, plus optional `caption` ("Maximum 1024 characters") and optional `filename` ("with extension"). Meta recommends `id` over `link`. | Base`messages/document-messages.md` | document-messages |
| F-022 | A `link` asset "must be on a publicly accessible server". | Base`templates/template-media.md` | template-media |

## Customer service window

| ID | Fact | Source URL | Excerpt |
|---|---|---|---|
| F-030 | A user message or call opens a 24-hour customer service window. Another message from the user resets it to 24 hours. | Base`messages/send-messages.md` | send-messages |
| F-031 | While the window is open, any service message type may be sent. After it closes, only approved template messages can be sent. Templates are "the only type of message that can be sent … outside of a customer service window". | send-messages.md; Base`templates/overview.md` | send-messages, templates-overview |
| F-032 | Messages may only be sent to users who have opted in. | Base`messages/send-messages.md` | send-messages |
| F-033 | Error `131047` means "More than 24 hours have passed since the recipient last replied". The fix is to send a template message. | Base`support/error-codes.md` | error-codes |

## Templates

| ID | Fact | Source URL | Excerpt |
|---|---|---|---|
| F-040 | Templates must be `APPROVED` before they can be sent. | Base`templates/overview.md` | templates-overview |
| F-041 | Parameter format is `named` or `positional`; positional is the default. | Base`templates/overview.md` | templates-overview |
| F-042 | Named parameters are "unique, single strings, composed of lowercase characters and underscores". At send time they are passed as `{type:"text", parameter_name, text}` and may be in any order. | Base`templates/overview.md` | templates-overview |
| F-043 | Positional parameters are `{{1}}`, `{{2}}`, …. Send values must appear in placeholder order. | Base`templates/overview.md` | templates-overview |
| F-044 | Body: one body component per template, multiple parameters allowed, "Maximum of 1024 characters". | Base`templates/components.md` | templates-components |
| F-045 | A text header allows 1 parameter and 60 characters. A footer allows 60 characters. A media header `format` is one of `IMAGE`, `VIDEO`, `GIF` or `DOCUMENT`. | Base`templates/components.md` | templates-components |
| F-046 | A media header is sent as `{type:"header", parameters:[{type:"<document\|image\|video>", "<same>":{id}}]}`. | Base`templates/utility-templates/utility-templates.md` | utility-templates |
| F-047 | Media for `id`/`link` in template header parameters follows the same rule as F-016. | Base`templates/template-media.md` | template-media |
| F-048 | Optional `currency` (`fallback_value`, `code`, `amount_1000`) and `date_time` (`fallback_value`) parameter objects exist. | Base`templates/template-media.md` | template-media |
| F-049 | Rejection reasons include: special characters such as `#`, `$` or `%` in variable parameters; non-sequential parameters; too many parameters for the message length; and a template that starts or ends with a parameter ("dangling parameters are not allowed"). | Base`templates/template-review.md` | template-review |
| F-050 | Utility templates must be non-promotional and specific to or requested by the user. This covers order and transaction updates, so it fits invoices. Marketing content is re-categorized as marketing. | Base`templates/template-categorization.md`, `templates/utility-templates/utility-templates.md` | template-categorization, utility-templates |
| F-051 | Send-time errors: `132000` (parameter count mismatch), `132001` (template missing for the language, or not approved), `132005` (translated text too long), `132007` (policy violation), `132012` (parameter values formatted incorrectly), `132015` (paused for low quality), `132016` (permanently disabled). | Base`support/error-codes.md` | error-codes |

## Media upload

| ID | Fact | Source URL | Excerpt |
|---|---|---|---|
| F-060 | Upload endpoint is `POST /{Version}/{Phone-Number-ID}/media`, sent as multipart form-data. Fields are `messaging_product=whatsapp`, `file`, and `type` ("Required" in the guide). The curl example also sets the MIME type on the file part (`file=@…;type=<MIME_TYPE>`). | Base`business-phone-numbers/media.md`, Base`reference/whatsapp-business-phone-number/media-upload-api.md` | media-guide, media-upload-api |
| F-061 | The upload response is `{ "id": string }`. | media-upload-api.md | media-upload-api |
| F-062 | Media IDs returned by the API expire after 30 days. Media IDs in webhooks expire after 7 days. | Base`business-phone-numbers/media.md` | media-guide |
| F-063 | Supported document MIME types are text/plain, application/vnd.ms-excel, the xlsx type, application/msword, the docx type, application/vnd.ms-powerpoint, the pptx type and application/pdf, each with a 100 MB maximum. Images are image/jpeg and image/png, 5 MB each, and must be 8-bit RGB or RGBA. | Base`business-phone-numbers/media.md` | media-guide |
| F-064 | `131053` means "Unable to upload the media used in the message". A mismatched MIME type is a common cause. | media.md; error-codes.md | media-guide, error-codes |

## Errors

| ID | Fact | Source URL | Excerpt |
|---|---|---|---|
| F-070 | The error envelope is `{error:{message, type, code, error_data:{messaging_product, details}, error_subcode, fbtrace_id}}`. | Base`support/error-codes.md` | error-codes |
| F-071 | Error handling should be built around `code`, not subcodes or HTTP status. `error_subcode` is "Deprecated. Will not be returned in v16.0+". `message` combines the code and title, e.g. `(#130429) Rate limit hit`. | Base`support/error-codes.md` | error-codes |
| F-072 | Errors may arrive synchronously, through a webhook, or both. | Base`support/error-codes.md` | error-codes |
| F-073 | Authorization group: `0`, `3`, `10`, `190`, `200`, `200`–`299`. | error-codes.md §Authorization errors | error-codes |
| F-074 | Integrity group: `368`, `130497`, `131031`. | error-codes.md §Integrity errors | error-codes |
| F-075 | Throttling group: `4`, `80007`, `130429`, `131048`, `131056`, `133016`, `131064`. | error-codes.md §Throttling errors | error-codes |
| F-076 | From "Other errors": `1` and `2` (server/temporary), `100` (unsupported or misspelled parameter), `130403` (business blocked user), `131000` (unknown), `131005` (permission), `131008` (missing parameter), `131009` (invalid parameter value), `131016` (service unavailable), `131021` (sender equals recipient), `131026` (undeliverable: not on WhatsApp, terms not accepted, or old app), `131049` (ecosystem engagement), `131050` (user stopped marketing), `131051` (unsupported type), `131052` (user media download failed), `131053` (media upload), `131057` (maintenance mode). | error-codes.md §Other errors | error-codes |
| F-077 | HTTP status per code is given only for the Marketing Messages API table. Cloud API rows have no HTTP status. | error-codes.md §Marketing Messages API | error-codes |

## Webhooks

| ID | Fact | Source URL | Excerpt |
|---|---|---|---|
| F-080 | Verification GET has `hub.mode=subscribe`, `hub.challenge` and `hub.verify_token`. Compare `hub.verify_token` with the stored string. If they match, respond `200` with the `hub.challenge` value. Otherwise respond with a 400-level status or anything other than 200. | Base`webhooks/create-webhook-endpoint.md` | create-webhook-endpoint |
| F-081 | `hub.mode` "will always be set to subscribe". | https://developers.facebook.com/docs/graph-api/webhooks/getting-started | graph-webhooks |
| F-082 | The `X-Hub-Signature-256: sha256=<hash>` header carries an HMAC-SHA256 of "the post body payload", keyed with the app secret. Compare against "everything after `sha256=`". The example hash is 64 lowercase hex characters. | Base`webhooks/create-webhook-endpoint.md`; graph-webhooks | create-webhook-endpoint, graph-webhooks |
| F-083 | POST: respond 200 if valid. Batches hold at most 1000 updates and batching is not guaranteed. Failed deliveries are retried for 7 days, so the server should dedupe. Unacknowledged responses are dropped after 7 days. Self-signed certificates are not supported. | create-webhook-endpoint.md | create-webhook-endpoint |
| F-084 | Payloads are up to 3 MB. Retries can produce duplicate notifications. | Base`webhooks/overview.md` | webhooks-overview |
| F-085 | Envelope: `object` is always `"whatsapp_business_account"`. `entry[].id` is the WABA ID. `entry[].changes[].field` is one of `messages`, `group_lifecycle_update`, `group_settings_update` or `group_participant_update`. `value.metadata` has `{display_phone_number, phone_number_id}`. `value.contacts[]` has `{profile:{name}, wa_id?}`. | Base`reference/webhooks/whatsapp-incoming-webhook-payload.md` | incoming-webhook-payload |
| F-086 | Inbound messages carry `messages[]` and outbound statuses carry `statuses[]`. Errors appear in three places: system, app and account errors in `value.errors`; inbound errors in `messages[].errors` with `type: unsupported`; outbound errors in `statuses[].errors`. | Base`webhooks/reference/messages.md` | wh-messages |
| F-087 | Common message fields are `from`, `id`, `timestamp` (string, Unix) and `type`. Text messages carry `text.body`. | incoming-webhook-payload.md; Base`webhooks/reference/messages/text.md` | incoming-webhook-payload, wh-text |
| F-088 | Document messages carry `document.{caption?, filename, mime_type, sha256, id, url?}`. Image messages carry `image.{caption?, mime_type, sha256, id, url?}`. `url` has been rolling out gradually since Nov 12, 2025. | Base`webhooks/reference/messages/document.md`, `image.md` | wh-document, wh-image |
| F-089 | Button messages carry `button.{payload, text}` and `context.{from, id}`, triggered by a quick-reply tap on a template. | Base`webhooks/reference/messages/button.md` | wh-button |
| F-090 | Unsupported messages carry `type:"unsupported"`, `unsupported.type` and `errors[]` with codes `131051` or `131060`. | Base`webhooks/reference/messages/unsupported.md` | wh-unsupported |
| F-091 | A status object has `id`, `status`, `timestamp`, `recipient_id`, and optionally `conversation`, `pricing` and `errors[]`. Status values per the status page are `delivered`, `failed`, `played`, `read` and `sent`. Pricing fields are `billable` (to be deprecated), `pricing_model` (`CBP`/`PMP`), `category` and `type` (`regular`, `free_customer_service`, `free_entry_point`). `conversation` is omitted on v24.0+ unless the message is in a free entry point window. | Base`webhooks/reference/messages/status.md` | wh-status |
| F-092 | Webhook error objects are `{code, title, message, error_data:{details}, href}`; `message` is the same as `title`. | Base`webhooks/reference/messages/errors.md` | wh-errors |

## Pricing (informational only; no code depends on it)

| ID | Fact | Source URL | Excerpt |
|---|---|---|---|
| F-095 | `pricing.md`: "All non-template messages are free", and utility templates inside an open customer service window are free. | Base`pricing.md` | pricing |
| F-096 | `pricing/non-template-messages.md` (marked "upcoming"): "Effective October 1, 2026", Meta charges for service messages and for utility messages inside the window. | Base`pricing/non-template-messages.md` | pricing-non-template |

## Conflicts & gaps

| ID | Topic | What the docs say | Decision |
|---|---|---|---|
| C-1 | Webhook retry window | 7 days on the WhatsApp pages (F-083, F-084); 36 hours on the generic Graph page | Document 7 days. The library has no timers, so nothing in code depends on it. |
| C-2 | `hub.challenge` type | "A random string" (WhatsApp page) vs "An int" (Graph page) | Treat it as an opaque string and echo it unchanged. |
| C-3 | Status `played` | Missing from the payload-reference enum; present on the status page (F-091) | Accept `played`. |
| C-4 | Upload `type` field | Required in the guide; absent from the reference schema (F-060) | Send `messaging_product`, `file` (Blob carrying the MIME type) and `type`. |
| C-5 | Service-message pricing | F-095 vs F-096 | Not used by code. Noted in the README only. |
| G-1 | `filename` on a template DOCUMENT header parameter | Not shown on any fetched page | **Not supported in v0.1** (user decision, 2026-10-16). |
| G-2 | Newlines, tabs or repeated spaces in template parameter values | No rule found. Only error `132012` "formatted incorrectly" | The signature helper never emits `\n` or `\t`. This is a library choice (user decision, 2026-10-16). |
| G-3 | Per-parameter length limit for utility templates | Not found. The only per-parameter limit is 15 chars, for authentication templates | No per-parameter limit is enforced. The body limit (F-044) applies to the template text, which the library cannot see unless the caller passes it. |
| G-4 | Constant-time signature comparison | Not stated by Meta | Library choice: constant-time compare. |
| G-5 | HTTP status per Cloud API error code | Not given (F-077) | Expose `httpStatus` as received and categorize by `code` only. |
| G-6 | `https` required for `link` | Not stated. Only "publicly accessible" (F-022) | Validate it as an absolute `http(s)` URL; do not require https. |
| G-7 | Template-header `id` vs `link` | F-046 shows only `id`; F-047 says `id` or `link` | Accept both. |
