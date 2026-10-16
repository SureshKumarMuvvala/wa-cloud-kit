# Source excerpt: wh-messages

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `8d726d4082ad5c7c616689d4fdea7a60b24f3426a23c37de93ebcc22422322d6` (5434 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
Messages webhooks describing a message sent by a WhatsApp user — either directly, via an ad, or via a UI component in a previously received message — all have the same common structure. You can easily identify these webhooks because they include a `messages` array. For example, this webhook describes a text message sent to a business:
Messages webhooks describing a message sent by a business to a WhatsApp user have a different structure. You can easily identify these because they include a `statuses` array. For example, this webhook describes a message that has been delivered to a WhatsApp user's device:
These webhooks don't describe the contents of the outgoing message itself, only its status, and each outgoing message can have up to three separate webhooks (one for a status of sent, one for delivered, and one for read).
- System-, app-, and account-level errors appear as a `value` object property (`entry.changes.value.errors`). See the [errors](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/errors) reference.
- Incoming message errors appear in the `messages` array (`entry.changes.value.messages.errors`). These webhooks have `type` set to `unsupported`. See the [unsupported](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/unsupported) reference.
- Outgoing message errors appear in the `statuses` array (`entry.changes.value.statuses.errors`). See the [status](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/status) reference.
```
