# Source excerpt: send-messages

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `08420f192277e8188c44710e9d805033b0d756cd26fe4968b5a7b208dd2d6697` (17953 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
When a WhatsApp user messages you or [calls you](https://developers.facebook.com/documentation/business-messaging/whatsapp/calling/pricing#how-calling-changes-the-24-hour-customer-service-window), a 24-hour timer called a customer service window starts. If the user messages or calls you again before the timer expires, the timer resets to 24 hours.
While the window is open, you can send any of the service message types listed below to the user. When the window closes, you can only send pre-approved [template messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview).
The API returns the following JSON response when it successfully accepts your send message request. This response only indicates that the API successfully **accepted your request** — it does not indicate successful delivery of your message. You receive delivery status via **messages** webhooks instead.
| `<PACING_STATUS>`<br><br>_String_ | Indicates [template pacing](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-pacing) status. The `message_status` property is only included in responses when sending a [template message](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview) that uses a template that is being paced. | `wamid.HBgLMTY0NjcwNDM1OTUVAgARGBI4MjZGRDA0OUE2OTQ3RkEyMzcA` |
We highly recommend that you include both the plus sign and country calling code when sending a message to a customer. If the plus sign is omitted, your business phone number's country calling code is prepended to the customer's phone number. This can result in undelivered or misdelivered messages.
If you are using a link (`link`) to a media asset on your server (as opposed to the ID (`id`) of an asset you have uploaded to the Meta servers), the Cloud API internally caches the asset for 10 minutes. The cached asset is reused in subsequent send message requests if the link in subsequent payloads is the same as the link in the initial payload.
When sending a series of messages, the order in which messages are delivered is not guaranteed to match the order of your API requests. If you need to ensure the sequence of message delivery, confirm receipt of a `delivered` status in a [status messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/status) webhook before sending the next message in your message sequence.
```

## Added for v0.3 (re-fetched 2026-10-18; sha256 unchanged)

```text
You can send the following types of service messages during an open customer service window.
[Interactive list messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-list-messages) allow you to present WhatsApp users with a list of options to choose from.
[Interactive reply buttons](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-reply-buttons-messages) messages allow you to send up to three predefined replies for users to choose from.
* All messages except authentication templates: **30 days**.
If you do not receive a status messages webhook with `status` set to `delivered` before the TTL is exceeded, assume the message was dropped.
If you send a message that fails (`status` set to `failed`), there could be a minor delay before you receive the webhook, so you may wish to build in a small buffer before assuming the message was dropped.
```
