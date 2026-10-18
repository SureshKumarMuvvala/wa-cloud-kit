# Examples

Single-file examples you can copy. They import `wa-cloud-kit`, which resolves to the **built** package in `../dist`, so build first:

```sh
pnpm install
pnpm build
pnpm examples:build   # compiles examples/ to examples-dist/ (git-ignored)
```

| Example                                                                    | Shows                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`webhook-handler/server.ts`](webhook-handler/server.ts)                   | A `node:http` webhook server: verification handshake, signature check over the raw bytes, immediate `200`, then `createWebhookRouter` (tenant resolver, demo idempotency store, unrouted items reported) and `reduceMessageStatus`. |
| [`send-invoice/send-invoice.ts`](send-invoice/send-invoice.ts)             | Check a template is `APPROVED`, upload a PDF, render a tenant signature, send the template.                                                                                                                                         |
| [`onboarding/complete-signup.ts`](onboarding/complete-signup.ts)           | Embedded Signup server steps: parse the browser event, exchange the code, confirm the number with `listPhoneNumbers`, `subscribeApp`, `registerPhoneNumber`.                                                                        |
| [`send-invoice/invoice-template.json`](send-invoice/invoice-template.json) | The `createTemplate` input for the invoice template. Replace `headerHandle` with a sample handle from Meta's Resumable Upload API (the library does not wrap it).                                                                   |

## Run

```sh
WA_APP_SECRET=... WA_VERIFY_TOKEN=... node examples-dist/webhook-handler/server.js

WA_TOKEN=... WA_PHONE_NUMBER_ID=... WA_WABA_ID=... WA_API_VERSION=v26.0 WA_TEMPLATE_ID=... \
  node examples-dist/send-invoice/send-invoice.js invoice.pdf +15550000001

WA_APP_ID=... WA_APP_SECRET=... WA_API_VERSION=v26.0 WA_PIN=... \
  node examples-dist/onboarding/complete-signup.js '<session event JSON>' '<code>'
```

Secrets are read from environment variables and are never printed. Anything written in these files uses the fictional values from `CLAUDE.md` (phone numbers in the `+1555…` range); never commit a real token, app secret or phone number.

`pnpm check` builds the package, then typechecks and lints `examples/` against `dist/`, so an example cannot drift from the public API.
