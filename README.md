# wa-cloud-kit

A small, typed, stateless TypeScript client for the Meta WhatsApp Cloud API.

- Send **template** messages (named or positional body variables, optional DOCUMENT header such as an invoice PDF), plus **text** and **document** messages.
- **Upload media** (documents, JPEG, PNG).
- **Webhooks**: verification handshake, `X-Hub-Signature-256` check, and parsing into flat message/status/error events.
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

## Errors

All errors extend `WaError`:

| Class                  | When                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `WaValidationError`    | Input or config failed validation. No request was sent.                                                 |
| `WaTransportError`     | `fetch` threw (network, abort, DNS).                                                                    |
| `WaApiError`           | Non-2xx with the Graph error envelope. Has `code`, `details`, `fbtraceId`, `httpStatus` and `category`. |
| `WaHttpError`          | Non-2xx without the envelope (HTML, empty, other JSON).                                                 |
| `WaResponseShapeError` | 2xx with an unexpected body.                                                                            |

`category` is derived from the Graph `code` only (`waErrorCategory(code)`), never from the HTTP status. The access token never appears in an error.

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

## Pricing note

Meta's pricing pages currently disagree on whether service (non-template) messages are free (C-5, F-095, F-096). The library does not depend on pricing; check Meta's pricing pages for your account.

## Facts

Every Meta behaviour this library relies on is recorded in [`docs/facts.md`](docs/facts.md) with its source URL and retrieval date. The design is in [`docs/specs/wa-cloud-kit.md`](docs/specs/wa-cloud-kit.md).

## License

MIT © 2026 Suresh Kumar Muvvala
