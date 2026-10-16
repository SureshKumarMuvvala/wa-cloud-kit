# Source excerpt: wh-unsupported

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/unsupported.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `e83c0f42e7537af6e6c4e8c839249e40fb20912446ebbf965e47eaaac478b650` (8588 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
"type": "unsupported",
| `<ERROR_CODE>` | The error code. Possible values:<br><br>- `131051` — Cloud API does not support the message type.<br>- `131060` — The message is currently unavailable. This typically occurs when a WhatsApp user messages a business [onboarded with a WhatsApp Business app phone number](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users), for the first time. | `131051` |
| `<ERROR_TITLE>` | A human-readable error title. Possible values:<br><br>- `Message type unknown` — Corresponds to error code `131051`.<br>- `This message is currently unavailable.` — Corresponds to error code `131060`. | `Message type unknown` |
The following example shows a webhook triggered by a WhatsApp user sending an unsupported message type (error code `131051`). For unavailable messages (error code `131060`), the payload structure is the same but the `errors` object values differ — see the [`ERROR_CODE`](#parameters) parameter for details.
```
