# Source excerpt: wh-interactive

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/interactive.md>
- Retrieved: 2026-10-18
- Format: Markdown (HTML entities decoded)
- Raw sha256: `12ff0de4ff43f229a6bade4a8a89c92ad6b225f3791475b56d303e8a4e5edac3` (9778 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
- A WhatsApp user taps a row in an [interactive list message](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-list-messages).
- A WhatsApp user taps a button in an [interactive reply button message](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-reply-buttons-messages).
                "type": "interactive",
                  "type": "list_reply",
                    "description": "<ROW_DESCRIPTION>"
                  "type": "button_reply",
                    "id": "<BUTTON_ID>",
| `<CONTEXTUAL_WHATSAPP_MESSAGE_ID>`<br><br>_String_ | WhatsApp message ID of the message containing the button the WhatsApp user tapped. | `wamid.HBgLMTQxMjU1NTA4MjkVAgASGBQzQUNCNjk5RDUwNUZGMUZEM0VBRAA=` |
```
