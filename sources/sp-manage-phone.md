# Source excerpt: sp-manage-phone

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/manage-phone-numbers.md>
- Retrieved: 2026-10-18
- Format: Markdown (HTML entities decoded)
- Raw sha256: `77b039ed4371efaf7e02bf5b154393faada2dce3171579395269b65a4b592d1e` (11403 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
Use the [Phone Numbers API](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/phone-number-management-api#get-version-waba-id-phone-numbers) to get a list of business phone numbers on a client's WABA.
curl 'https://graph.facebook.com/<API_VERSION>/<CUSTOMER_WABA_ID>/phone_numbers' \
-H 'Authorization: Bearer <CUSTOMER_BUSINESS_TOKEN>'
      "code_verification_status": "<VERIFICATION_STATUS>",
      "platform_type": "CLOUD_API",
      "id": "<BUSINESS_PHONE_NUMBER_ID>"
After a client successfully completes the Embedded Signup flow and their phone number is verified, you must register the number for Cloud API use by calling the [Register API](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/register-api#post-version-phone-number-id-register) with the `messaging_product` and `pin` parameters. See [Step 4: Register the number](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/registering-phone-numbers#step-4--register-the-number) for details.
**Note:** A phone number **must** be registered up to 14 days after going through the Embedded Signup flow. If a number is not registered during that window, the phone must go through to the Embedded Signup flow again prior to registration.
```
