# Source excerpt: text-messages

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/text-messages.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `da7f545e3a6ccba310b6c34938206dae21c20bbb1222f43b632f6a758d42a4e4` (4182 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
| `<BODY_TEXT>`<br><br>_String_ | **Required.**<br><br>Body text. The WhatsApp client automatically hyperlinks URLs in the body text.<br><br>Maximum 4096 characters. | `As requested, here's the link to our latest product: https://www.meta.com/quest/quest-3/` |
| `<ENABLE_LINK_PREVIEW>`<br><br>_Boolean_ | **Optional.**<br><br>Set to `true` to have the WhatsApp client attempt to render a link preview of any URL in the body text string.<br><br>See [Link Preview](#link-preview) below. | `true` |
You can have the WhatsApp client attempt to render a preview of the first URL in the body text string, if it contains one. URLs must begin with `http://` or `https://`. If the body text string contains multiple URLs, the WhatsApp client renders only the first URL.
```
