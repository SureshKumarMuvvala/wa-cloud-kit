# Source excerpt: wh-account-update

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/account_update.md>
- Retrieved: 2026-10-18
- Format: Markdown (HTML entities decoded)
- Raw sha256: `c2996aad69558b9f06200d6abfcc079bd4179c3111dd35945da04de389926a14` (33612 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
- A WhatsApp Business Account is shared ("installed") or unshared ("uninstalled") with a partner.
- A business customer grants or revokes app permissions for a WhatsApp Business Account.
      "id": "<WHATSAPP_BUSINESS_ACCOUNT_ID>",
            "event": "<EVENT>",
            <!-- only included for PARTNER_* events -->
              "waba_id": "<CUSTOMER_WABA_ID>",
              "owner_business_id": "<CUSTOMER_BUSINESS_PORTFOLIO_ID>",
| `<EVENT>`<br><br>_String_ | WhatsApp Business Account ("WABA") event.<br><br>Values can be:<br><br>`ACCOUNT_DELETED` — Indicates WABA was deleted.<br><br>`ACCOUNT_RESTRICTION` — Indicates WABA has been restricted due to [policy violations](https://developers.facebook.com/documentation/business-messaging/whatsapp/policy-enforcement). See `restriction_info` for restriction details.<br><br>`ACCOUNT_VIOLATION` — Indicates WABA violated Meta [policies or terms](https://developers.facebook.com/documentation/business-messaging/whatsapp/policy-enforcement).<br><br>`AD_ACCOUNT_LINKED` — Indicates WABA has been onboarded onto Marketing Messages API for WhatsApp through Embedded Signup or Intent API and gives the partner access to its ad accounts.<br><br>`AUTH_INTL_PRICE_ELIGIBILITY_UPDATE` — Indicates WABA is eligible for [authentication-international rates](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/authentication-international-rates).<br><br>`BUSINESS_PRIMARY_LOCATION_COUNTRY_UPDATE` — Indicates WABA's [primary business location](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/authentication-international-rates#primary-business-location) has been set.<br><br>`DISABLED_UPDATE` — Indicates WABA violated Meta [policies or terms](https://developers.facebook.com/documentation/business-messaging/whatsapp/policy-enforcement).<br><br>`MM_LITE_TERMS_SIGNED` — Indicates that the WABA has successfully accepted the MM API for WhatsApp terms of service.<br><br>`PARTNER_ADDED` — Indicates WABA has been shared with a [Solution Partner](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/overview).<br><br>`PARTNER_APP_INSTALLED` — Indicates a business customer granted the app one or more permissions.<br><br>`PARTNER_APP_UNINSTALLED` — Indicates a business customer deauthenticated or uninstalled the app.<br><br>`PARTNER_CLIENT_CERTIFICATION_STATUS_UPDATE` — Indicates the WABA's [partner-led business verification](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/partner-led-business-verification) submission is approved, rejected, or discarded.<br><br>`PARTNER_REMOVED` — Indicates WABA has been unshared with a [Solution Partner](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/overview).<br><br>`VOLUME_BASED_PRICING_TIER_UPDATE` — Indicates WABA's volume-based pricing tier has been updated.<br><br>**New:** `ACCOUNT_OFFBOARDED` — Indicates WABA has been offboarded due to a device change or phone number reregistration.<br><br>**New:** `ACCOUNT_RECONNECTED` — Indicates WABA has been reconnected after a device change or phone number reregistration. | `PARTNER_ADDED` |
      "id": "2949482758682047",
            "event": "PARTNER_ADDED",
              "waba_id": "980198427658004",
            "event": "PARTNER_APP_INSTALLED",
              "waba_id": "1191624265890717",
```
