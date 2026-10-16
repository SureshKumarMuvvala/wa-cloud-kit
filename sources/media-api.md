# Source excerpt: media-api

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/media/media-api.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `b1487fc5e5bcd0271dc319bfcbff229c12444ede1a4e8c030913faa6e21df00d` (4271 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
| DELETE | [/{Version}/{Media-ID}](#delete-version-media-id) |
| GET | [/{Version}/{Media-ID}](#get-version-media-id) |
A successful response includes an object with a media URL. The URL is only valid for 5 minutes. To use this URL, see [Download Media](https://developers.facebook.com/docs/business-messaging/whatsapp/business-phone-numbers/media#download-media).
```

## Added for v0.2 (retrieved 2026-10-16)

```text
Delete Media
You can also use the optional query **`?phone_number_id`** for **`Retrieve Media URL`** and **`Delete Media`**. This parameter checks to make sure the media belongs to the phone number before retrieval or deletion.
To delete media, make a **DELETE** call to the ID of the media you want to delete.
To retrieve your media’s URL, make a **GET** call to **`/{{Media-ID}}`**. Use the returned URL to download the media file. Note that clicking this URL (i.e. performing a generic GET) will not return the media; you must include an access token. For more information, see [Download Media](https://developers.facebook.com/docs/business-messaging/whatsapp/business-phone-numbers/media#download-media).
- [User Access Token](https://developers.facebook.com/docs/facebook-login/access-tokens#usertokens) with **`whatsapp_business_messaging`** permission
- Media object ID from either uploading media endpoint or media message Webhooks
| phone_number_id | string |  | Specifies that deletion of the media only be performed if the media belongs to the provided phone number. |
| phone_number_id | string |  | Specifies that this action only be performed if the media belongs to the provided phone number. |
| file_size | string |  |  |
| messaging_product | string |  |  |
| mime_type | string |  |  |
| sha256 | string |  |  |
| url | string |  |  |
| success | boolean |  |  |
```
