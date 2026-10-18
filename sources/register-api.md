# Source excerpt: register-api

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/phone-number-registration.md>
- Retrieved: 2026-10-18
- Format: Markdown (HTML entities decoded)
- Raw sha256: `bf351d95d0692bd53a592789ff0112b5d2240b5d58fb0f9f35ba9e90ad435ad5` (10019 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
| POST | [/{Version}/{Phone-Number-ID}/register](#post-version-phone-number-id-register) |
1. Phone number must be in UNVERIFIED status
2. Provide a 6-digit PIN for two-step verification
- Two-step verification is mandatory for all registered numbers
- PIN must be securely stored and managed by the business
| messaging_product | "whatsapp" | ✓ | Must be 'whatsapp' to indicate WhatsApp Business messaging product |
| pin | string | ✓ | 6-digit PIN for two-step verification setup |
| data_localization_region | [WhatsAppDataLocalizationRegion](#whatsappdatalocalizationregion) |  |  |
Data localization region for message storage (deprecated in v21+)
| success | boolean | ✓ | Indicates whether the registration was successful |
        "code": 4,
        "error_subcode": 2446079,
| backup | [WhatsAppBusinessAccountBackup](#whatsappbusinessaccountbackup) |  |  |
```
