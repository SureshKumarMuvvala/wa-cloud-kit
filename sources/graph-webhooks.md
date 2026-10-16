# Source excerpt: graph-webhooks

- URL: <https://developers.facebook.com/docs/graph-api/webhooks/getting-started>
- Retrieved: 2026-10-16
- Format: HTML (tags stripped for excerpt)
- Raw sha256: `1383a7dab338b9a1d765fb0e73fe89e3c62511b928793c2c216620bd38dcaa32` (176760 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
hub.challenge=1158201444&
hub.verify_token=meatyhamhock
This value will always be set to subscribe .
hub.challenge
hub.verify_token
Verify that the hub.verify_token value matches the string you set in the Verify Token field when you configure the Webhooks product in your App Dashboard (you haven't set up this token string yet).
Respond with the hub.challenge value.
X-Hub-Signature-256: sha256={super-long-SHA256-signature}
We sign all Event Notification payloads with a SHA256 signature and include the signature in the request's X-Hub-Signature-256 header, preceded with sha256= . You don't have to validate the payload, but you should.
Compare your signature to the signature in the X-Hub-Signature-256 header (everything after sha256= ). If the signatures match, the payload is genuine.
If any update sent to your server fails, we will retry immediately, then try a few more times with decreasing frequency over the next 36 hours. Your server should handle deduplication in these cases. Unacknowledged responses will be dropped after 36 hours.
```
