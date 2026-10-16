# wa-cloud-kit

A small, typed, stateless TypeScript client for the Meta WhatsApp Cloud API.

- Send **template** messages (named or positional body variables, optional DOCUMENT header such as an invoice PDF), plus **text** and **document** messages.
- **Upload media** (documents, JPEG, PNG).
- **Manage templates** (v0.2): create a utility template with a DOCUMENT header, list, get status, delete.
- **Read, download and delete media** (v0.2), with the token sent only to an allow-listed host.
- **Webhooks**: verification handshake, `X-Hub-Signature-256` check, and parsing into flat message/status/error/template-status events.
- A helper that renders a tenant's **signature** into a template variable.
- Transport through an injectable `fetch`; typed errors built from the Graph API error format.

ESM only, Node ≥ 22 or any runtime with `fetch` and WebCrypto. The only dependency is the `zod@^4` peer.

The library keeps **no state**: every client is built from one tenant's config, so a multi-tenant app can create one client per request or per tenant.

```sh
pnpm add wa-cloud-kit zod
```

## Sending an invoice template

```ts
import { createWaClient, renderSignatureParameter } from "wa-cloud-kit";

const wa = createWaClient({
  phoneNumberId: tenant.phoneNumberId,
  accessToken: tenant.accessToken,
  graphApiVersion: "v26.0",
});

const { mediaId } = await wa.uploadMedia({
  file: invoicePdfBlob,
  mimeType: "application/pdf",
  filename: "INV-2026-0042.pdf",
});

const result = await wa.sendTemplate({
  to: "+15550000001",
  name: "invoice_ready",
  languageCode: "en",
  header: { document: { id: mediaId } },
  body: {
    format: "named",
    parameters: [
      { type: "text", parameter_name: "customer_name", text: "Asha" },
      { type: "text", parameter_name: "invoice_no", text: "INV-2026-0042" },
      renderSignatureParameter({
        signature: { name: "Accounts Team", company: tenant.companyName },
        parameterName: "signature",
      }),
    ],
  },
});
// result.messageId — accepted, not yet delivered. Delivery arrives via webhook.
```

> **`graphApiVersion` is required config.** There is no default. Graph API versions expire (see the [version table](https://developers.facebook.com/docs/graph-api/changelog/versions), facts F-004), and an unversioned call silently uses whatever version is set in your app dashboard (F-005). Pin the version you have tested against and upgrade deliberately.

Notes:

- Text and document messages only reach the user inside the 24-hour customer service window. Outside it, send an approved template (F-030, F-031); otherwise the API fails with `131047`, which `WaApiError.category` reports as `"service_window_closed"`.
- `to` is passed through unchanged. Include the leading `+` and country code; without `+`, Meta prepends the business number's country code (F-013).
- Uploaded media IDs expire after 30 days (F-062), so upload close to send time.
- A success response means _accepted_, not delivered, and delivery order is not guaranteed (F-012, F-014).

## Templates

Meta addresses templates by WABA and sending by phone number, so there are two clients. Both take the tenant's config on every call and keep no state.

```ts
import { createWaBusinessClient } from "wa-cloud-kit";

const business = createWaBusinessClient({
  wabaId: tenant.wabaId,
  accessToken: tenant.accessToken,
  graphApiVersion: "v26.0",
});

const created = await business.createTemplate({
  name: "invoice_with_pdf",
  language: "en_US",
  category: "UTILITY",
  header: { format: "DOCUMENT", headerHandle: handleFromResumableUpload },
  body: {
    text: "Hello {{customer_name}}, invoice {{invoice_number}} for {{amount}} is attached and due on {{due_date}}. For any questions contact {{signature}}. Thank you.",
    format: "named",
    examples: [
      { name: "customer_name", example: "Alex" },
      { name: "invoice_number", example: "INV-0001" },
      { name: "amount", example: "120.00" },
      { name: "due_date", example: "1 December" },
      { name: "signature", example: "Accounts Team | Example Traders" },
    ],
  },
  footer: { text: "Invoices from Example Traders" },
});
// created.status is "PENDING"; check created.category too (see below).

const { status } = await business.getTemplate({
  templateId: created.templateId,
  fields: ["status"],
});
```

Template body: `Hello {{customer_name}}, invoice {{invoice_number}} for {{amount}} is attached and due on {{due_date}}. For any questions contact {{signature}}. Thank you.`

- **The body must not start or end with a parameter.** Meta rejects "dangling parameters" (F-049, error `2388299`), so end the body in static text. `createTemplate` checks this before sending anything.
- A new template is `PENDING` and cannot be sent until `APPROVED` (F-040); review can take up to 24 hours (F-116). Follow the `message_template_status_update` webhook (below) instead of polling.
- A utility template that contains marketing material is **re-categorized** by Meta (F-050, F-109), so check the returned `category`; the library does not throw.
- `headerHandle` is an opaque sample handle you obtain from Meta's Resumable Upload API; the library does not wrap that API (D-6). It is not the media id you use when sending.
- `listTemplates` pages with a cursor: pass `nextCursor` back as `after`. The library never follows Meta's `paging.next` URL.
- `deleteTemplate({ name })` deletes **every language** of that name; an approved template's name is then blocked for 30 days (F-120).
- Only `UTILITY` templates are supported in v0.2; edit, buttons and marketing/authentication templates are not.

## Media

```ts
const { url } = await wa.getMediaUrl({ mediaId }); // URL is valid for 5 minutes (F-131)
const file = await wa.downloadMedia({ url }); // { body: Blob, contentType, size }
const same = await wa.downloadMediaById({ mediaId }); // both steps
await wa.deleteMedia({ mediaId }); // uploads otherwise persist 30 days (F-136)
```

`downloadMedia` sends your token **only** to an `https` URL whose hostname is exactly in `allowedMediaHosts` (default `["lookaside.fbsbx.com"]`, F-133), with no credentials in the URL and no port other than 443; every redirect hop is checked the same way. Anything else throws `WaValidationError` before a request is sent. If Meta serves your media from another host, pass it in `allowedMediaHosts`; there are no wildcards. Downloads are capped by `maxBytes` (default 100,000,000). On a `404`, fetch a new URL and retry (F-132); the library does not retry.

`getMediaUrl` and `deleteMedia` always send the client's `phone_number_id`, so Meta answers only for media that belongs to that number (F-130, F-134).

## Errors

All errors extend `WaError`:

| Class                  | When                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `WaValidationError`    | Input or config failed validation. No request was sent.                                                 |
| `WaTransportError`     | `fetch` threw (network, abort, DNS).                                                                    |
| `WaApiError`           | Non-2xx with the Graph error envelope. Has `code`, `details`, `fbtraceId`, `httpStatus` and `category`. |
| `WaHttpError`          | Non-2xx without the envelope (HTML, empty, other JSON).                                                 |
| `WaResponseShapeError` | 2xx with an unexpected body.                                                                            |

`category` is derived from the Graph `code` (`waErrorCategory(code, subcode?)`), never from the HTTP status. The one exception is `"template_creation"`: the documented template-creation identifiers (`2388024`, `2388039`, `2388040`, `2388047`, `2388072`, `2388073`, `2388293`, `2388299`; F-104, F-122) are matched in either `code` or `error_subcode`, and no other subcode is ever read. The access token never appears in an error.

## Webhooks

```ts
import { parseWebhookPayload, verifyWebhookChallenge, verifyWebhookSignature } from "wa-cloud-kit";

// GET: verification handshake
const check = verifyWebhookChallenge(new URL(req.url).searchParams, process.env.WA_VERIFY_TOKEN);
if (check.ok) return new Response(check.challenge, { status: 200 });
return new Response("forbidden", { status: 403 });

// POST: verify the signature over the RAW body, then parse
const rawBody = new Uint8Array(await req.arrayBuffer());
const valid = await verifyWebhookSignature({
  rawBody,
  signatureHeader: req.headers.get("x-hub-signature-256"),
  appSecret: process.env.WA_APP_SECRET,
});
if (!valid) return new Response("bad signature", { status: 401 });
const { events } = parseWebhookPayload(JSON.parse(new TextDecoder().decode(rawBody)));
```

Guidance from Meta's docs:

1. Respond `200` quickly (F-083).
2. Deduplicate on `message.id`, or `status.id` + `status`. Failed deliveries are retried for up to 7 days and can be duplicated (F-083, F-084).
3. Expect payloads up to 3 MB (F-084).
4. Media IDs in webhooks expire after 7 days (F-062).
5. Always verify the signature over the exact bytes received. Re-serialized JSON has different bytes.

Unknown message types arrive as `{ type: "other", originalType, raw }`. Unknown status values arrive as status events with `known: false`.

### Template status events

`message_template_status_update` changes arrive as `{ kind: "template_status", wabaId, templateId, templateName, templateLanguage, event, knownEvent, reason, … }`. They carry no phone number, so identify the tenant by `wabaId`. Surface a rejection to the tenant with `reason` and, when present, `rejection.recommendation`.

- Template webhooks always go to the app's default callback URL; per-WABA and per-phone-number overrides do not apply to them (F-161).
- The payload has no unique id. Dedupe on `wabaId:templateId:event:eventTime`; retries can duplicate deliveries (F-083, F-084).
- `kind: "template_status"` is a new member of `WaWebhookEvent`, so an exhaustive `switch` needs a new case when you upgrade.

## Examples

[`examples/`](examples) has a minimal `node:http` webhook handler and a "send invoice PDF" script. They import the built package, so run `pnpm build` first; see [`examples/README.md`](examples/README.md).

## Pricing note

Meta's pricing pages currently disagree on whether service (non-template) messages are free (C-5, F-095, F-096). The library does not depend on pricing; check Meta's pricing pages for your account.

## Facts

Every Meta behaviour this library relies on is recorded in [`docs/facts.md`](docs/facts.md) with its source URL and retrieval date. The design is in [`docs/specs/wa-cloud-kit.md`](docs/specs/wa-cloud-kit.md) (v0.1) and [`docs/specs/wa-cloud-kit-v0.2.md`](docs/specs/wa-cloud-kit-v0.2.md) (templates, media, multi-tenant notes). Items that can only be checked against Meta's live API are listed in the v0.2 spec §10.

## License

MIT © 2026 Suresh Kumar Muvvala
