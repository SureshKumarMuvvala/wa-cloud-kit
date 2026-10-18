# Source excerpt: es-implementation

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/implementation.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `5b7256a2df721b736b15c83e04d08c83d77307aac84cc23c1e4de78d248d36dd` (20828 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
    phone_number_id: '<CUSTOMER_BUSINESS_PHONE_NUMBER_ID>',
    waba_id: '<CUSTOMER_WABA_ID>',
    business_id: '<CUSTOMER_BUSINESS_PORTFOLIO_ID>',
      if (data.type === 'WA_EMBEDDED_SIGNUP') {
    if (data.type === 'WA_EMBEDDED_SIGNUP') {
    if (!event.origin.endsWith('facebook.com')) return;
  if (!event.origin.endsWith('facebook.com')) return;
```

## Added for v0.3 (re-fetched 2026-10-18; sha256 unchanged)

```text
On the final screen, both clicking **Finish** and closing the popup (for example, by clicking the X button) are considered successful onboarding. In both scenarios, Embedded Signup returns the exchangeable token code and the session info object containing the customer's asset IDs. Exiting on the final screen is not considered a cancel event.
  type: 'WA_EMBEDDED_SIGNUP',
  event: '<FLOW_FINISH_TYPE>',
    <!-- only included for multi-WABA flows -->
    waba_ids: ['<CUSTOMER_WABA_ID_1>', '<CUSTOMER_WABA_ID_2>']
| `<FLOW_FINISH_TYPE>` | Indicates the customer successfully completed the flow.<br><br>**Possible Values:**<br><br>* `FINISH`: Indicates successful completion of [Cloud API flow](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/default-flow).<br>* `FINISH_ONLY_WABA`: Indicates user completed flow [without a phone number](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/bypass-phone-addition).<br>* `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING`: Indicates user completed flow [with a WhatsApp business app number](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users).<br>* `FINISH_OBO_MIGRATION`: Indicates user completed an on-behalf-of migration flow.<br>* `FINISH_GRANT_ONLY_API_ACCESS`: Indicates user completed a grant-only API access flow.<br>* `ERROR`: Indicates the user encountered an error during the flow. | `FINISH` |
    current_step: '<CURRENT_STEP>',
  event: 'CANCEL',
    error_message: '<ERROR_MESSAGE>',
    error_code: '<ERROR_CODE>',
    session_id: '<SESSION_ID>',
    timestamp: '<TIMESTAMP>',
      const code = response.authResponse.code;
      response_type: 'code',
      override_default_response_type: true,
**Warning:** The exchangeable token code has a time-to-live of 30 seconds, so make sure you are able to exchange it for the customer's business token before the code expires. If you are testing and just dumping the response to your JavaScript console, then manually exchanging the code using another app like Postman or your terminal with cURL, set up your token exchange query before you begin testing.
* You must be subscribed to the [account_update](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/account_update) webhook, as this webhook is triggered whenever a customer successfully completes the Embedded Signup flow, and contains their business information that you will need.
| `<GRAPH_API_VERSION>` | **Required.**<br><br>Graph API version. This indicates which version of Graph API to call, if you are relying on the SDK's methods to perform API calls.<br><br>In the context of Embedded Signup, you won't be relying on the SDK's methods to perform API calls. Set this to the latest API version:<br><br>v25.0 | v25.0 |
Click the **Create from template** button and create a configuration from the **WhatsApp Embedded Signup Configuration With 60 Expiration Token** template. The template generates a configuration for the most commonly used permissions and access levels.
```
