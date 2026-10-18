# Source excerpt: wh-status

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/status.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `fad358ba51ab83a546b438222c84a52f2383873adcfc4fd911de0bec26d8a2d4` (18258 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
"id": "<WHATSAPP_BUSINESS_ACCOUNT_ID>",
"id": "<WHATSAPP_MESSAGE_ID>",
"status": "<STATUS>",
"timestamp": "<WEBHOOK_TRIGGER_TIMESTAMP>",
"recipient_id": "<USER_PHONE_NUMBER_OR_GROUP_ID>",
(2) Omitted entirely for v24.0+ unless webhook is for a free entry point conversation -->
"id": "<CONVERSATION_ID>",
"type": "<CONVERSATION_CATEGORY>"
"billable": <IS_BILLABLE?>,
"pricing_model": "<PRICING_MODEL>",
"type": "<PRICING_TYPE>",
"category": "<PRICING_CATEGORY>"
| `<PRICING_MODEL>`<br><br>_String_ | Pricing model. Values can be:<br><br>`CBP` — Indicates conversation-based pricing applies. Will only be set to this value if the webhook was sent before July 1, 2025.<br><br>`PMP` — Indicates [per-message pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) applies. | `PMP` |
| `<PRICING_TYPE>`<br><br>_String_ | Pricing type.<br><br>`regular` — Indicates the message is billable.<br><br>`free_customer_service` — Indicates the message is free because it was either a utility template message or non-template message sent within a customer service window.<br><br>`free_entry_point` — Indicates the message is free because it was sent within an open free entry point window. | `regular` |
| `<STATUS>`<br><br>_String_ | Message status. Values can be:<br><br>`delivered` — Indicates message was successfully delivered to the WhatsApp user's device.<br><br>- WhatsApp UI equivalent: Two checkmarks.<br><br>`failed` — Indicates failure to send or deliver the message to the WhatsApp user's device.<br><br>- WhatsApp UI equivalent: Red error triangle.<br><br>`played` — Indicates the first time a voice message is played by the WhatsApp user's device.<br><br>- WhatsApp UI equivalent: Blue microphone.<br><br>`read` — Indicates the message was displayed in an open chat thread in the WhatsApp user's device.<br><br>- WhatsApp UI equivalent: Two blue checkmarks.<br><br>`sent` — Indicates the message was successfully sent from our servers.<br><br>- WhatsApp UI equivalent: One checkmark. | `read` |
"id": "102290129340398",
"id": "wamid.HBgLMTY1MDM4Nzk0MzkVAgASGBQzQUFERjg0NDEzNDdFODU3MUMxMAA=",
"status": "sent",
"timestamp": "1750030073",
"recipient_id": "16505551234",
"id": "72b14d6bd5407799e66f64d1b338e567",
"type": "marketing"
"billable": true,
"pricing_model": "PMP",
"type": "regular",
"category": "marketing"
"recipient_id": "16505551234"
"id": "wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBI0QUQ2MjA4NEYyRkExNjMyREUA",
"status": "failed",
"timestamp": "1751142888",
```

## Added for v0.3 (re-fetched 2026-10-18; sha256 unchanged)

```text
| `<CONVERSATION_EXPIRATION_TIMESTAMP>`<br><br>_String_ | Unix timestamp indicating when the conversation will expire.<br><br>The expiration_timestamp property is only included for `sent` status. | `1744434060` |
```
