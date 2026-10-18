# Source excerpt: subscribed-apps-api

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/subscribed-apps-api.md>
- Retrieved: 2026-10-18
- Format: Markdown (HTML entities decoded)
- Raw sha256: `202f3c01c6fb286e822b8c4b575756431548dfd63543376295e08c0577ee9d4c` (18781 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
| DELETE | [/{Version}/{WABA-ID}/subscribed_apps](#delete-version-waba-id-subscribed-apps) |
| GET | [/{Version}/{WABA-ID}/subscribed_apps](#get-version-waba-id-subscribed-apps) |
| POST | [/{Version}/{WABA-ID}/subscribed_apps](#post-version-waba-id-subscribed-apps) |
Unsubscribing will immediately stop all webhook deliveries for this WABA.
### Request Body (Optional)
| override_callback_uri | string |  | Custom webhook callback URL to override app default |
| verify_token | string |  | Verification token for webhook security |
| success | boolean | ✓ | Indicates whether the subscription operation was successful |
| data | array of [SubscribedApp](#subscribedapp) |  | Array containing subscription details |
| whatsapp_business_api_data | [WhatsAppBusinessApiData](#whatsappbusinessapidata) | ✓ |  |
| override_callback_uri | string |  | Custom webhook callback URL for this subscription |
| id | string | ✓ | Unique identifier for the subscribed application |
| name | string | ✓ | Name of the subscribed application |
        "code": 803,
```
