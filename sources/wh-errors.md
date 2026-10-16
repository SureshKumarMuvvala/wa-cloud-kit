# Source excerpt: wh-errors

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/errors.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `77006e8f4bb83d018417e6f6b58d3e39fece428bf693b09177b0944726ead61b` (4559 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
"code": <ERROR_CODE>,
"title": "<ERROR_TITLE>",
"message": "<ERROR_MESSAGE>",
"details": "<ERROR_DETAILS>"
"href": "<ERROR_CODES_URL>"
| `<ERROR_MESSAGE>`<br><br>_String_ | [Error code](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes) message. This value is the same as the `title` property value. | `Rate limit hit` |
"code": 130429,
"title": "Rate limit hit",
"message": "Rate limit hit",
"details": "Message failed to send because there were too many messages sent from this phone number in a short period of time"
"href": "/documentation/business-messaging/whatsapp/support/error-codes"
```
