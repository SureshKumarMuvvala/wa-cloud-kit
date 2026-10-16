# Source excerpt: document-messages

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/document-messages.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `5bc7f82147b39d802ff89c306199a8aecdd19a7a89144ecece9246a930bc26ab` (5620 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
| `<MEDIA_CAPTION_TEXT>`<br><br>_String_ | **Optional.**<br><br>Media asset caption text.<br><br>Maximum 1024 characters. | `Lucky Shrub Invoice` |
| `<MEDIA_FILENAME>`<br><br>_String_ | **Optional.**<br><br>Document filename, with extension. The WhatsApp client will use an appropriate file type icon based on the extension. | `lucky-shrub-invoice.pdf` |
| `<MEDIA_ID>`<br><br>_String_ | **Required if using uploaded media, otherwise omit.**<br><br>ID of the [uploaded media asset](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media#upload-media). | `1013859600285441` |
| `<MEDIA_URL>`<br><br>_String_ | **Required if using hosted media, otherwise omit.**<br><br>URL of the media asset hosted on your public server. For better performance, we recommend using `id` and an [uploaded media asset ID](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media#upload-media) instead. | `https://www.luckyshrub.com/invoices/FmOzfD9cKf/lucky-shrub-invoice.pdf` |
Only the above listed document types are officially supported and guaranteed to display correctly in the WhatsApp client. Other file types may be sent via the API, but they are not supported and may not be handled as expected.
```
