# Source excerpt: mark-read

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/mark-message-as-read.md>
- Retrieved: 2026-10-18
- Format: Markdown (HTML entities decoded)
- Raw sha256: `f3734f0c0d338761d0ea743339497d0d0f99b92894a99594a0aa5fd2bb761c2d` (3281 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
When you receive a **message** webhook indicating an [incoming message](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages#incoming-messages), you can use the `message.id` value to mark the message as read.
Mark incoming messages as read within 30 days of receipt. When you mark a message as read, the API also marks earlier messages in the conversation as read.
If you mark a message as read with an invalid message ID, the API returns error code `131009` ("Parameter value is not valid"). Provide a valid `wamid` from a received message as the `message_id`.
  "status": "read",
  "message_id": "<WHATSAPP_MESSAGE_ID>"
A successful mark-as-read request returns the following response:
  "success": true
```
