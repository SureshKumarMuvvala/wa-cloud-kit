# Source excerpt: typing-indicators

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/typing-indicators.md>
- Retrieved: 2026-10-18
- Format: Markdown (HTML entities decoded)
- Raw sha256: `df5820db626f577e0275e3c15d2789c224e0c277c8b38c9e63149fa1fa8b2c83` (3120 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
When you get a **messages** webhook indicating a [received message](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages), you can use the `message.id` value to mark the message as read and display a typing indicator so the WhatsApp user knows you are preparing a response. This is good practice if it will take you a few seconds to respond.
The typing indicator will be dismissed once you respond, or after 25 seconds, whichever comes first. To prevent a poor user experience, only display a typing indicator if you are going to respond.
  "typing_indicator": {
    "type": "text"
  "success": true
```
