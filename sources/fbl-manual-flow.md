# Source excerpt: fbl-manual-flow

- URL: <https://developers.facebook.com/documentation/facebook-login/guides/advanced/manual-flow.md>
- Retrieved: 2026-10-18
- Format: Markdown (HTML entities decoded)
- Raw sha256: `b1e2eb3539e966c149a19f805a9fce347ccb3e1aa47dde67b2396116bb0ff55a` (18301 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
GET https://graph.facebook.com/v25.0/oauth/access_token?client_id={app-id}
&redirect_uri={redirect-uri}
&client_secret={app-secret}
&code={code-parameter}
+ `redirect_uri`. This argument is required and must be the same as the original `request_uri` that you used when starting the OAuth login process.
+ `client_secret`. Your unique app secret, shown on the [App Dashboard](https://developers.facebook.com/apps). Never include this app secret in client-side code or in binaries that could be decompiled. It is extremely important that it remains completely secret as it is the core of the security of your app and all the people using it.
The response you will receive from this endpoint will be returned in JSON format and, if successful, is:
  "access_token": {access-token},
  "token_type": {type},
  "expires_in":  {seconds-til-expiration}
* `access_token` An [app access token](https://developers.facebook.com/documentation/facebook-login/guides/access-tokens) or an access token for a developer of the app.
```
