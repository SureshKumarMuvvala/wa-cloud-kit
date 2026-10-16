# Source excerpt: message-api

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/message-api.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `55ac95f3f363f325808abe095f85997df7b188cf86441b74f0677823e51a6988` (13661 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
| POST | [/{Version}/{Phone-Number-ID}/messages](#post-version-phone-number-id-messages) |
| messaging_product | string | ✓ |  |
| recipient_type | One of "individual", "group" | ✓ | The type of recipient. |
| to | string | ✓ | The recipient's phone number for individual messages, and group-id for group message. |
| type | string | ✓ | The type of message |
A media object. Either `id` or `link` is required.
| type | One of "button", "call_permission_request", "catalog_message", "list", "product", "product_list", "flow" | ✓ | The type of interactive message to send. |
| type | One of "text", "video", "image", "document" | ✓ | The header type. |
| type | One of "HOME", "WORK" |  | Address type |
| type | One of "HOME", "WORK" |  | Email type |
| type | One of "HOME", "WORK" |  | Phone type |
| wa_id | string |  | WhatsApp ID |
| type | One of "HOME", "WORK" |  | URL type |
| messaging_product | string |  |  |
| id | string | ✓ | Unique row identifier. |
| input | string |  |  |
| wa_id | string |  |  |
| id | string |  |  |
| message_status | One of "accepted", "held_for_quality_assessment", "paused" |  | The status of a WhatsApp message: - `accepted`: The message has been accepted by WhatsApp and is being processed - `held_for_quality_assessment`: The message is being held for quality assessment before delivery - `paused`: The message delivery has been paused |
```
