# Source excerpt: access-tokens

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `2ce5d1d34be96f548b925f337b16a6c2f5ae1f1dce7d1e3ce934341a0b80a4ed` (8921 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
When making API requests, include your token in an authorization request header, preceded by `Bearer`. For example:
Access tokens are opaque strings. A full token looks like this:
Tokens can vary in length and their internal structure and characteristics can change over time. Do not parse, decode, or make assumptions about the format of an access token — treat it as an opaque string. Use a variable-length data type without a specific maximum size to store access tokens.
```
