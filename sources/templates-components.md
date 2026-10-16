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

## Added for v0.2 (retrieved 2026-10-16)

```text
Templates are made up of four primary components which you define when you create a template: header, body, footer, and buttons. The components you choose for each of your templates should be based on your business needs. The only required component is the body component.
Media headers can be an image, video, gif, or a document such as a PDF. You must upload all media with the [Resumable Upload API](https://developers.facebook.com/docs/graph-api/guides/upload). The syntax for defining a media header is the same for all media types.
  "format": "<FORMAT>",
    "header_handle": [
        "header_handle": [
| `<HEADER_HANDLE>` | Uploaded media asset handle. Use the [Resumable Upload API](https://developers.facebook.com/docs/graph-api/guides/upload) to generate an asset handle. | `4::aW...` |
Text headers are optional elements that can be added to the top of template messages. Each template may include only one text header. Do not use Markdown special characters in this component.
```
