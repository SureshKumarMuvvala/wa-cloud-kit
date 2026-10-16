# Source excerpt: templates-overview

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `d1dadcc3a75f52e8af76421804e04bc338054b89f1c8d164799d402a8d6165a7` (17251 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
Templates are WhatsApp Business Account assets that can be sent in template messages via Cloud API or Marketing Messages API for WhatsApp. Template messages are the only type of message that can be sent to WhatsApp users outside of a [customer service window](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages#customer-service-windows). Templates are commonly used when messaging users in bulk or when no customer service window is open between you and the user.
Upon template creation, if a string includes one or more parameters, you can specify their format — either `named` or `positional` — and you must include an example value for each parameter. If you do not specify a format, the template uses `positional` format by default.
Parameters using the named format must be unique, single strings, composed of lowercase characters and underscores, wrapped in double curly brackets, for example, `{{first_name}}`. Example values in template creation payloads and real values in template send payloads can appear in any order.
Positional parameters must be ordered array index numbers, starting from 1, wrapped in double curly brackets: (`{{1}}`...`{{2}}`...and so on). Example values in template creation payloads and real values in template send payloads must appear in the order in which their corresponding placeholders appear in the component text string.
Templates must have a status of `APPROVED` before they can be sent in template messages. A template's status is initially set by the template review process, but can be changed to another value based on usage and [quality feedback](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-quality).
```
