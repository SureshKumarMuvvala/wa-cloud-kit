---
"wa-cloud-kit": minor
---

v0.2: template management (`createWaBusinessClient`: create, list, get status, delete utility templates with a DOCUMENT header), media get/download/delete on `WaClient` (the token is sent only to an allow-listed https host), a `template_creation` error category for the documented `2388xxx` identifiers, and `message_template_status_update` webhook events (`kind: "template_status"`).

**Breaking for exhaustive `switch` users:** `WaWebhookEvent` gains a `template_status` member (it has no `phoneNumberId`), and `WaErrorCategory` gains `"template_creation"`. Previously, `message_template_status_update` changes were counted in `skippedChanges`.
