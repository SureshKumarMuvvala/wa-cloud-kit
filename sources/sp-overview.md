# Source excerpt: sp-overview

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/overview.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `d5256bcf73484a2b4d70aed515ae5c353bbb0cbe6c3d8def72b8e7db81bfe23b` (12684 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
This documentation contains information, instructions, and resources for **partners** — businesses that provide, or want to provide, WhatsApp messaging services to other businesses. If you are building an app that will not be used by other businesses, refer to our [Cloud API Get Started](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started) guide instead.
Partners are business entities that deploy value-added solutions as WhatsApp authorized service providers on behalf of their clients. Partners include Solution Partners, Tech Providers, and Tech Partners.
Tech Providers are similar to Solution Partners in that they also can offer a full range of WhatsApp Business Platform services to other businesses, either by providing these services on their own, or by [partnering with a Solution Partner](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/multi-partner-solutions) who already offers these services.
Unlike Solution Partners, however, Tech Providers do not have credit lines. Instead, clients onboarded by Tech Providers must provide their own payment method after onboarding is complete. Meta will then bill these clients for API usage, and the Tech Provider will bill for other services.
[Embedded Signup](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview) is a scalable, authentication and authorization interface that can be launched directly from your website or client portal. Embedded Signup automatically generates all required WhatsApp assets for clients who successfully complete the flow, and authorizes your app to access those assets.
| Has a credit line | Yes | No | No |
| Bills customers directly for API usage (vs. Meta billing customers for usage) | Yes | No | No |
If you are a Tech Provider or Tech Partner, you should use **business tokens** exclusively. If you are a Solution Partner, you should use a system token only when sharing your credit line with onboarded clients; in all other cases, use business tokens.
[Business tokens](https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens#business-integration-system-user-access-tokens) are access tokens scoped to individual onboarded clients. Use these tokens when accessing onboarded client data, such as WhatsApp Business Accounts, message templates, business phone numbers, and when sending and receiving messages for your clients.
To get a business token that is scoped to a client, you must exchange a code returned to you when that client completes the [Embedded Signup](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview) flow. This process is described in the Onboarding Clients section of the Embedded Signup documentation.
* **whatsapp_business_management** — necessary if your app needs access to your clients' WhatsApp Business Account settings and message templates. If your app uses this permission to access WABAs not owned by your business, you must have **Advanced access**. Without it, API calls return error code `200`.
* **whatsapp_business_messaging** — necessary if your app needs access to your clients' business phone number settings, or if your app will be used by your clients to send and receive messages.
Before you can officially begin onboarding clients, submit your app for [App Review](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/app-review) and request **Advanced access** approval for any permissions your app requires.
If **Advanced access** is not approved for a given permission, the permission does not appear in the Embedded Signup flow and your clients cannot grant it to your app. If your app uses the `whatsapp_business_management` permission to access WABAs not owned by your business without **Advanced access**, API calls return error code `200`.
```
