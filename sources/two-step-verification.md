# Source excerpt: two-step-verification

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/two-step-verification.md>
- Retrieved: 2026-10-18
- Format: Markdown (HTML entities decoded)
- Raw sha256: `7f6f6cd46ac5994bfa9e61c1f12c2b844191c9c4eee90e069a58971a92ae3f12` (2907 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
Set up two-step verification for your phone number to require a 6-digit PIN when registering the phone number. Use the [WhatsApp Business Phone Number API](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/whatsapp-business-account-phone-number-api#post-version-phone-number-id) to set it up with the parameters below. There is no endpoint to disable two-step verification.
| `pin` | **Required.**<br><br>A 6-digit PIN you wish to use for two-step verification. |
 'https://graph.facebook.com/v25.0/FROM_PHONE_NUMBER_ID' \
 -d '{"pin" : "6_DIGIT_PIN"}'
  "success": true
```
