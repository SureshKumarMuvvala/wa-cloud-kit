# Source excerpt: sp-manage-accounts

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/manage-accounts.md>
- Retrieved: 2026-10-18
- Format: Markdown (HTML entities decoded)
- Raw sha256: `eca92cdd2794775196d1c61313e31618d72ba08fefa3eb1a7d0d72725cf5c56f` (14442 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
After a business finishes the Embedded Signup flow, you can get the shared WABA ID using the returned `accessToken` with the [Debug Token](https://developers.facebook.com/docs/graph-api/reference/debug_token) endpoint. Include your [System User access token](https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens#generating-system-user-access-tokens) in a request header prepended with `Authorization: Bearer` for this API call.
GET https://graph.facebook.com/v25.0/debug_token
  ?input_token=<TOKEN_RETURNED_FROM_SIGNUP_FLOW>
    "granular_scopes" : [
        "scope" : "whatsapp_business_management",
        "target_ids" : [
Each object in the `granular_scopes` array identifies the IDs of every WABA that has granted your app a given permission (`scope`). IDs for the most recently onboarded WABAs appear first, so capture the first ID in the `target_ids` array for the `whatsapp_business_management` scope.
If a client leaves the Embedded Signup flow before completing it, the client may have shared the WABA but the phone number's certificate may not be ready. Without a ready certificate, you cannot register the number for API use. Reach out to the client to help them complete the Embedded Signup flow.
```
