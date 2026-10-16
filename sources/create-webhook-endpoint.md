# Source excerpt: create-webhook-endpoint

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `9d2189ca896b5278d5ccd5da50e21fd15a96be73fee95236c400c3772f7de03f` (7086 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
Your webhook endpoint server must have a valid TLS or SSL digital security certificate, correctly configured and installed. Self-signed certificates are not supported.
?hub.mode=subscribe
&hub.challenge=<HUB.CHALLENGE>
&hub.verify_token=<HUB.VERIFY_TOKEN>
| `<HUB.CHALLENGE>` | A random string that Meta will generate. | `1158201444` |
| `<HUB.VERIFY_TOKEN>` | A verification string of your own choosing. Store this string on your server.<br><br>Add this string to the **Verify token** field in the App Dashboard when you [configure webhooks](#configure-webhooks) later. | `vibecoding` |
To validate GET requests, compare the `hub.verify_token` value in the request to the verification string you have stored on your server. If the values match, the request is valid. Otherwise, the request is invalid.
If the request is valid, respond with HTTP status `200` and the `hub.challenge` value. If the request is invalid, respond with a 400-level HTTP status code, or anything other than status `200`.
When you [configure webhooks](#configure-webhooks), Meta sends a GET request to your webhook endpoint. If it returns status `200` and the `hub.challenge` value included in the request, Meta considers your webhook endpoint verified, and begins sending you webhooks. If your webhook endpoint responds with anything else, however, Meta will consider your webhook endpoint unverified, and webhooks will not be sent to your endpoint.
X-Hub-Signature-256: sha256=<SHA256_PAYLOAD_HASH>
| `<SHA256_PAYLOAD_HASH>` | HMAC-SHA256 hash, calculated using the post body payload and your [app secret](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/basic-settings#app-secret) as the secret key. | `b63bb356dff0f1c24379efea2d6ef0b2e2040853339d1bcf13f9018790b1f7d2` |
1. Generate an HMAC-SHA256 hash using the JSON payload as the message input and your [app secret](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/basic-settings#app-secret) as the secret key.
2. Compare your generated hash to the hash assigned to the `X-Hub-Signature-256` header (everything after `sha256=`).
If the request is valid, respond with HTTP status 200. Otherwise, respond with a 400-level HTTP status, or anything other than status 200.
POST requests are aggregated and sent in a batch with a maximum of 1000 updates. However, batching cannot be guaranteed so be sure to adjust your servers to handle each POST request individually.
If any POST request sent to your server fails, delivery is retried immediately, then a few more times with decreasing frequency over the next 7 days. Your server should handle deduplication in these cases.
Unacknowledged responses will be dropped after 7 days.
```
