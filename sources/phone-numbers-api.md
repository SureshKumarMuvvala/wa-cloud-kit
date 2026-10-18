# Source excerpt: phone-numbers-api

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/phone-number-management-api.md>
- Retrieved: 2026-10-18
- Format: Markdown (HTML entities decoded)
- Raw sha256: `da4613ec34e20b5618c23d36f7274966c2ae714180d45526c61a4fdab59a093a` (19918 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
## GET /{Version}/{WABA-ID}/phone_numbers
| fields | string |  | Comma-separated list of fields to include in the response. If not specified, default fields will be returned. Available fields include: id, display_phone_number, verified_name, status, quality_rating, country_code, country_dial_code, code_verification_status, unified_cert_status, account_mode, host_platform, messaging_limit_tier, is_official_business_account |
| limit | integer [min: 1, max: 100] |  | Maximum number of phone numbers to return per page |
| after | string |  | Cursor for pagination - retrieve records after this cursor |
| id | string | ✓ | Unique identifier for the phone number status record |
| display_phone_number | string | ✓ | Phone number in international format for display purposes |
| status | [WhatsAppPhoneNumberStatus](#whatsappphonenumberstatus) | ✓ |  |
| code_verification_status | [WhatsAppCodeVerificationStatus](#whatsappcodeverificationstatus) |  |  |
**Enum Values**: "BANNED", "CONNECTED", "DELETED", "DISCONNECTED", "FLAGGED", "MIGRATED", "PENDING", "RATE_LIMITED", "RESTRICTED"
**Enum Values**: "EXPIRED", "NOT_VERIFIED", "VERIFIED"
**Enum Values**: "CLOUD_API", "ON_PREMISE", "NOT_APPLICABLE"
| data | array of [WhatsAppBusinessAccountPhoneNumber](#whatsappbusinessaccountphonenumber) | ✓ | Array of phone number records |
| verified_name | string |  | Business name verified for this phone number |
```
