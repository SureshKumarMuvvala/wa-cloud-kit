# Source excerpt: template-review

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-review.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `c3005ef648010546d3f213ad995beea5ca7e9534856f6effe112c18472e10fdf` (6153 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
- Variable parameters contain special characters such as a `#`, `$`, or `%`.
- Variable parameters are not sequential. For example, `{{1}}`, `{{2}}`, `{{5}}`, `{{4}}`.
- The template contains too many variable parameters relative to the message length. You need to decrease the number of variable parameters or increase the message length.
- The message template cannot start or end with a parameter (dangling parameters are not allowed).
```

## Added for v0.2 (retrieved 2026-10-16)

```text
Once you have created your template you can submit it for approval. It can take up to 24 hours for an approval decision to be made. Once a decision has been made, a notification appears in your WhatsApp Manager and Meta sends an email to your Meta Business Suite admins. Meta also sends a [message_template_status_change](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/message_template_status_update) webhook.
If your message template is approved, its status will be set to **Active - Quality pending** (`APPROVED` in the API) and you can begin sending it to customers. If it is rejected, you can edit it and resubmit for approval, or appeal the decision.
If your template uses variables you must include sample variable values, such as media assets and text strings, with your submission. Providing a sample makes it easier for reviewers to visualize how your template will appear to customers.
- Variable parameters are missing or have mismatched curly braces. The correct format is `{{1}}` for positional parameters.
The message template is a duplicate of an existing template. If a template is submitted with the same wording in the body and footer of an existing template, the duplicate template will be rejected.
- The message template contains content that violates WhatsApp's Commerce Policy: When you offer goods or services for sale, Meta considers all messages and media related to your goods or services, including any descriptions, prices, fees, taxes, and/or any required legal disclosures, to constitute transactions. Transactions must comply with the WhatsApp Commerce Policy.
- The content contains potentially abusive or threatening content, such as threatening a customer with legal action or threatening to publicly shame them.
The body component will have different character limits depending on the format and tag of the template. The number of emojis allowed in the body component may also be limited.
If your submission is rejected you may file an appeal. Note that appeals must include a sample. If an approved template has become disabled, you may also edit it and resubmit it for approval.
The appeal will be reviewed and a decision made within 24 hours.
You can receive updates via the [message_template_status_update](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/message_template_status_update) webhook, which notifies whether a template is approved, pending, or rejected.
```
