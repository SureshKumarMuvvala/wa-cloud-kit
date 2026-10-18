# Source excerpt: webhooks-overview

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `8635b1574fe892bd4ee3d98e5e1d30c873760f31267ab2ef4385aba13429501a` (15414 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
Webhook payloads can be up to 3 MB.
If a webhook request to your endpoint receives an HTTP status code other than 200, or if the webhook cannot be delivered for another reason, Meta retries delivery with decreasing frequency until the request succeeds, for up to 7 days.
Note that Meta sends retries to all apps that have subscribed to webhooks (and their appropriate fields) for the WhatsApp Business account. These retries can result in duplicate webhook notifications.
```

## Added for v0.3 (re-fetched 2026-10-18; sha256 unchanged)

```text
- **whatsapp_business_messaging** — for **messages** webhooks
- **whatsapp_business_management** — for all other webhooks
```
