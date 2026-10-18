# Source excerpt: sp-manage-webhooks

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/manage-webhooks.md>
- Retrieved: 2026-10-18
- Format: Markdown (HTML entities decoded)
- Raw sha256: `6cc3b8cd548a3bf9b0412e918c8e2baf09d3dfda401dbbea084be8a54e523c20` (18766 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
**You must [individually subscribe to every WABA](#subscribe-to-webhooks-on-a-client-waba) for which you want to receive webhooks.** After fetching the client's WABA ID, subscribe your app to the ID to start receiving webhooks.
Repeat this process for any other WABAs for which you want to receive webhook notifications. If you subscribe your app to webhooks for multiple WABAs, WhatsApp sends all webhook notifications to the app's callback URL specified in the **Webhooks** product panel of the App Dashboard, unless you [override webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/override).
An **account_update** webhook is triggered with `event` set to `PARTNER_ADDED` when a client successfully completes the Embedded Signup flow.
      "id": "<BUSINESS_PORTFOLIO_ID>",
              "waba_id": "<CUSTOMER_WABA_ID>",
          "field": "account_update"
```
