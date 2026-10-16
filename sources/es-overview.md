# Source excerpt: es-overview

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `69ec3e0fa5d18926007eea468f13f7a8ea8a9df77da605d53226b4d1fc3a3126` (16389 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
**Warning:** **Embedded signup v2 will be deprecated on October 15, 2026.** Migrate your integration to [v4](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/version-4) before that date to avoid disruption. See [Versions](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/versions) for the full upgrade path.
Upon successful completion, Embedded Signup returns the customer's WABA ID, business phone number ID, and an exchangeable token code, to the window that spawned the flow. You must send this data to your server and use it in a server-to-server call to:
* exchange the code for a customer-scoped business token
* register the customer's business phone number for Cloud API use
* subscribe your app to webhooks on the customer's WABA
When these steps are complete, the customer's next action depends on your partner status. If you are a Solution Partner or are partnered with one, the customer can begin using your or your partner's app for messaging immediately. If you are not a Solution Partner, or not partnered with one, the customer must first attach a payment method to their WABA before they can begin messaging.
Business customers onboarded via Embedded Signup own all of their WhatsApp assets, which they can leverage with other Meta solutions such as [Ads that Click to WhatsApp](https://www.facebook.com/business/help/447934475640650).
Business customers also have full access to [WhatsApp Manager](https://business.facebook.com/wa/manage/), which they can use to access their assets. Note that you cannot restrict this access in any way. Refer to the [list of available assets](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/version-4).
By default, you can onboard up to 10 new business customers in a rolling 7-day window. Only newly onboarded customers count against this limit. You can see your current onboarded customer count in the **WhatsApp Manager** > **Partner overview** panel. You will be notified by email if you approach this limit.
If you complete Business Verification, App Review, and Access Verification, your limit is automatically increased to 200 new business customers in a rolling 7-day window. If you need to onboard more than 200 business customers per week, apply to become a [Meta Business Partner](https://business.whatsapp.com/partners/become-a-partner).
* Business phone numbers can only be registered for use with Cloud API.
**Note:** Existing WhatsApp Business Accounts (WABAs) that were originally created via the developer app cannot be selected or onboarded directly through the Embedded Signup flow.
Embedded Signup generates [business tokens](https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens#business-integration-system-user-access-tokens). When a business customer completes the Embedded Signup flow, Embedded Signup returns an exchangeable token code as a message event, which the JavaScript SDK captures. You must exchange this code for a business token using a server-to-server call.
If you are a Tech Provider, you will use business tokens exclusively.
```
