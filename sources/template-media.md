# Source excerpt: template-media

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-media.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `dcb716bb10e2838fc43ce45375e13264f12b6cbda1e6f801ae0624f366c8b917` (4944 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
When defining your media object, you can either [upload your media asset](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media#upload-media) to our servers and use its media ID (using the `id` property), or host the asset on your server and use its URL (using the `link` property). If you're using link, your asset must be on a publicly accessible server or the message will fail to send.
"type": "currency",
"fallback_value": "VALUE",
"amount_1000": NUMBER
"type": "date_time",
"fallback_value": "MONTH DAY, YEAR"
```

## Added for v0.2 (retrieved 2026-10-16)

```text
Before creating the template, you must upload your media file using the Resumable Upload API. This upload returns a media ID, which you then use as the value for the `header_handle` field in the template's header component.
            "4::aW..."
```
