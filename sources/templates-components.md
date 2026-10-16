# Source excerpt: templates-components

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/components.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `459032a551fcad1b8833d8e4d4f732e5c775735b586229a223561778255f4fb8` (26124 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
| `<HEADER_TEXT>`<br><br>_String_ | **Required.**<br><br>Header body text string. Supports 1 [parameter](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview#parameter-formats).<br><br>If this string contains a parameter, you must include the `example` property and example parameter value.<br><br>Maximum 60 characters. | `Our new sale starts {{sale_start_date}}!` |
| `<FORMAT>` | Indicates media asset type. Set to `IMAGE`, `VIDEO`, `GIF`, or `DOCUMENT`. | `IMAGE` |
The body component represents the core text of your message template and is a text-only template component. Templates are limited to one body component.
| `<BODY_TEXT>`<br><br>_String_ | **Required.**<br><br>Body text string. Supports multiple [parameters](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview#parameter-formats).<br><br>Maximum of 1024 characters. | `Thank you, {{first_name}}! Your order number is {{order_number}}.` |
| `<TEXT>` | Text to appear in template footer when sent.<br><br>60 characters maximum. | `Use the buttons below to manage your marketing subscriptions` |
```
