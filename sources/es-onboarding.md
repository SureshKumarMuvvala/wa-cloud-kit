# Source excerpt: es-onboarding

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-customers-as-a-tech-provider.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `91eae389a4c876b3c6defc0a96be7a1dee562348366817de2e51037f50b6fd31` (12984 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
**Note:** Perform all of the requests described below using server-to-server requests. Do not use client-side requests.
* the business customer's WABA ID (returned via [session logging](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/implementation#session-logging-message-event-listener) or [API request](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/manage-accounts#get-shared-waba-id-with-access-token))
* the business customer's business phone number ID (returned via [session logging](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/implementation#session-logging-message-event-listener) or [API request](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/manage-phone-numbers#getting-phone-numbers))
Use the **GET /oauth/access_token** endpoint to exchange the token code [returned](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/implementation#session-logging-message-event-listener) by Embedded Signup for a business integration system user access token ("business token").
curl --get 'https://graph.facebook.com/v21.0/oauth/access_token' \
-d 'client_id=<APP_ID>' \
-d 'client_secret=<APP_SECRET>' \
-d 'code=<CODE>'
Use the [POST /<WABA_ID>/subscribed_apps](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/subscribed-apps-api#post-version-waba-id-subscribed-apps) endpoint to subscribe your app to webhooks on the business customer's WABA. If you want the customer's webhooks to be sent to a different callback URL than the one set on your app, you have multiple [webhook override](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/override) options.
curl -X POST 'https://graph.facebook.com/<API_VERSION>/<WABA_ID>/subscribed_apps' \
Use the [Register API](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/register-api#post-version-phone-number-id-register) to register the business customer's business phone number for use with Cloud API.
curl 'https://graph.facebook.com/v21.0/<BUSINESS_CUSTOMER_PHONE_NUMBER_ID>/register' \
  "pin": "<DESIRED_PIN>"
| `<DESIRED_PIN>`<br>_String_ | **Required.**<br><br>Set this value to a 6-digit number. This will be the business phone number's two-step verification PIN. | `581063` |
```

## Added for v0.3 (re-fetched 2026-10-18; sha256 unchanged)

```text
If you are a Tech Provider or Tech Partner, any business customer who completes your implementation of the Embedded Signup flow will not be able to use your app to access their WhatsApp assets or send and receive messages (if you are offering messaging services) until you complete these steps.
## Step 1: Exchange the token code for a business token
## Step 2: Subscribe to webhooks on the customer's WABA
## Step 3: Register the customer's phone number
## Step 4: Send a test message
## Step 5: Instruct the customer to add a payment method
<BUSINESS_TOKEN>
| `<BUSINESS_TOKEN>` | The customer's [business token](https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens#business-integration-system-user-access-tokens). | `EAAAN6tcBzAUBOwtDtTfmZCJ9n3FHpSDcDTH86ekf89XnnMZAtaitMUysPDE7LES3CXkA4MmbKCghdQeU1boHr0QZA05SShiILcoUy7ZAb2GE7hrUEpYHKLDuP2sYZCURkZCHGEvEGjScGLHzC4KDm8tq2slt4BsOQE1HHX8DzHahdT51MRDqBw0YaeZByrVFZkVAoVTxXUtuKgDDdrmJQXMnI4jqJYetsZCP1efj5ygGscZBm4OvvuCYB039ZAFlyNn` |
```
