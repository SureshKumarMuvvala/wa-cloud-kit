# Source excerpt: wh-document

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/document.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `de203c74beee1dce4e2c805124157987bfa06adba4b74262b2b08959f7794770` (10263 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
"id": "<WHATSAPP_BUSINESS_ACCOUNT_ID>",
"id": "<WHATSAPP_MESSAGE_ID>",
"caption": "<MEDIA_ASSET_CAPTION>",
"filename": "<MEDIA_ASSET_FILENAME>",
"mime_type": "<MEDIA_ASSET_MIME_TYPE>",
"sha256": "<MEDIA_ASSET_SHA256_HASH>",
"id": "<MEDIA_ASSET_ID>",
"url": "<MEDIA_ASSET_URL>"
| `<MEDIA_ASSET_URL>`<br><br>_String_ | **This JSON property is being released to developers gradually over several weeks, starting November 12, 2025, and may not be available to you immediately.**<br><br>Media URL. You can query this URL directly with your access token to [download the media asset](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media#download-media). | `https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=133...` |
"id": "102290129340398",
"id": "wamid.HBgLMTY1MDM4Nzk0MzkVAgASGBQzQTRBNjU5OUFFRTAzODEwMTQ0RgA=",
"caption": "my receipt",
"filename": "receipt.pdf",
"mime_type": "application/pdf",
"sha256": "V5OPpLD/gEG6Xjg0MbmQDLFgcKsL+j5LfY4ny/pZ4MY=",
"id": "622684793477189",
"url": "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=133..."
```
