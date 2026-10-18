# Source excerpt: fbl-business

- URL: <https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business.md>
- Retrieved: 2026-10-18
- Format: Markdown (HTML entities decoded)
- Raw sha256: `504fd1cef85d338d5d1454f5a306cf819228881a98fbbdfcc2420c61df3e6db9` (26315 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
| Expiration and refresh | Defaults to **never expire** for the common offline server-to-server communication. | A **short-lived** token for online activities such as web browsers. |
| OAuth grant type | **Authorization Code** grant only. | **Implicit** grant by default, and can support authorization code grant for improved security. Mainly used for user-agent based clients such as web browsers and mobile apps. |
| Token Invalidation | Your business clients can invalidate business integration system User access tokens by going to **[Business Manager](https://business.facebook.com) > Settings > Business Settings > Integrations > Connected apps** and removing your app.<br> | Your business clients can invalidate User access tokens by going to Facebook and navigating to **Settings & privacy** > **Settings** > **Security and login** > **Business Integrations** and removing your app. |
| `set_token_expires_in_60_days` _bool_ | Optional.<br>When you generate a new token, set to `true` so that the token expires in 60 days. |
When the user completes the login dialog flow we will redirect the user to your redirect URL and include a code. You must then exchange this code for an access token by performing a server-to-server call to our servers.
GET https://graph.facebook.com/v25.0/oauth/access_token?
```
