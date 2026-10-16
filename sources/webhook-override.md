# Source excerpt: webhook-override

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/override.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `ee5aae203860e48ac4a9684eee44ae9b4644138940ed19f73cb21f4614a02730` (9459 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
Meta sends webhooks to the callback URL set on your app, but you can override this by designating an alternate callback URL for the WhatsApp Business account (WABA) or business phone number.
When a [supported field](#supported-webhook-fields) triggers a webhook, the system first checks if your app has designated an alternate callback URL for the business phone number associated with the event. If the business phone number has an alternate callback URL, the system sends the webhook there. If the phone number has no alternate, the system checks if the WABA associated with the number has an alternate callback URL. If the WABA has an alternate callback URL, the system sends the webhook there. If the WABA also has no alternate, the webhook falls back to your app's callback URL.
> **Note:** Template webhooks (`message_template_status_update`, `message_template_quality_update`, `message_template_components_update`, `template_category_update`) and account-level webhooks (`account_update`, `account_review_update`, `account_alerts`) do not support callback overrides. Meta always delivers these webhooks to your app's default callback URL.
Use the [Subscribed Apps API](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/subscribed-apps-api#post-version-waba-id-subscribed-apps) to set an alternate callback URL on a WABA.
Use the [Subscribed Apps API](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/subscribed-apps-api#get-version-waba-id-subscribed-apps) to get a list of all apps subscribed to webhooks on the WABA. The response should include an `override_callback_uri` property and value.
Use the [Subscribed Apps API](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/subscribed-apps-api#post-version-waba-id-subscribed-apps) to subscribe your app to webhooks on the WABA [as you normally would](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/manage-webhooks#subscribe) (that is, without any post body parameters). Subscribing without post body parameters removes the alternate callback URL from the WABA, and webhooks for the WABA will once again be sent to the callback URL set in the App Dashboard.
  "override_callback_uri":"<WABA_ALT_CALLBACK_URL>",
  "override_callback_uri":"https://my-waba-alternate-callback.com/webhook",
      "override_callback_uri" : "https://my-waba-alternate-callback.com/webhook"
    "override_callback_uri": "<PHONE_ALT_CALLBACK_URL>",
    "override_callback_uri": "https://my-phone-alternate-callback.com/webhook",
    "override_callback_uri": ""
| `<WABA_ALT_CALLBACK_URL>` | **Required.**<br><br>Alternate callback URL where [supported webhooks](#supported-webhook-fields) should be sent.<br><br>Maximum 200 characters. | `https://my-waba-alternate-callback.com/webhook` |
| `<PHONE_ALT_CALLBACK_URL>` | **Required.**<br><br>Alternate callback URL where [supported webhooks](#supported-webhook-fields) should be sent.<br><br>Maximum 200 characters. | `https://my-phone-alternate-callback.com/webhook` |
```
