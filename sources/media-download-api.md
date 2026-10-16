# Source excerpt: media-download-api

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/media/media-download-api.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `f0cb37817d3218ea6dceb19841c92bb0ded23087b70ba1cf47d4c019f5b51685` (1989 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
| GET | [/{Version}/{Media-URL}](#get-version-media-url) |
Download media files using URLs obtained from media retrieval endpoints.
Requires User Access Token with whatsapp_business_messaging permission.
Media URLs expire after 5 minutes and must be re-retrieved if expired.
Returns binary content with appropriate MIME type headers.
Not Found - Media not found or URL expired
```
