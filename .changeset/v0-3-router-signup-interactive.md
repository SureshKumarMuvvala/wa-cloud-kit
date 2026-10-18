---
"wa-cloud-kit": minor
---

v0.3: webhook router with a caller-supplied tenant resolver and idempotency store (`createWebhookRouter`, `webhookDedupeKey`), an order-independent message status reducer (`reduceMessageStatus`), Embedded Signup server helpers (`parseEmbeddedSignupEvent`, `exchangeEmbeddedSignupCode`, `listPhoneNumbers` + `findPhoneNumber`, `subscribeApp` / `listSubscribedApps` / `unsubscribeApp`, `registerPhoneNumber`, `setTwoStepPin`), interactive reply-button and list messages (`sendReplyButtons`, `sendList`), and `markAsRead` with an optional typing indicator.

**Breaking for exhaustive `switch` users:** `WaWebhookEvent` gains `kind: "account_update"` (previously counted in `skippedChanges`), and `WaInboundMessage` gains `type: "interactive"` for `button_reply` / `list_reply` (previously `type: "other"`). `ParsedWebhook` gains `unhandled`, the list behind `skippedChanges`.
