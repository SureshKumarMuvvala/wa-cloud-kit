# Source excerpt: throughput

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/throughput.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `fb9c1e2c09cc382f01c846e5f87bbf4e4d34fc5254ae82919a245b6c2a7b8780` (4964 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
For each registered business phone number, Cloud API supports up to 80 messages per second (mps) by default, and up to [1,000 mps](#higher-throughput) by automatic upgrade.
If you attempt to send more messages than your current throughput level allows, the API will return error code `130429` until you are within your allowed level again. Also, throughput levels are intended for messaging campaigns involving different WhatsApp user phone numbers. If you attempt to send too many messages to the same WhatsApp user number, you may encounter a pair [rate limit](https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform#rate-limits) error.
```
