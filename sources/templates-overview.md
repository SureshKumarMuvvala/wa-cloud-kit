# Source excerpt: templates-overview

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `d1dadcc3a75f52e8af76421804e04bc338054b89f1c8d164799d402a8d6165a7` (17251 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
Templates are WhatsApp Business Account assets that can be sent in template messages via Cloud API or Marketing Messages API for WhatsApp. Template messages are the only type of message that can be sent to WhatsApp users outside of a [customer service window](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages#customer-service-windows). Templates are commonly used when messaging users in bulk or when no customer service window is open between you and the user.
Upon template creation, if a string includes one or more parameters, you can specify their format — either `named` or `positional` — and you must include an example value for each parameter. If you do not specify a format, the template uses `positional` format by default.
Parameters using the named format must be unique, single strings, composed of lowercase characters and underscores, wrapped in double curly brackets, for example, `{{first_name}}`. Example values in template creation payloads and real values in template send payloads can appear in any order.
Positional parameters must be ordered array index numbers, starting from 1, wrapped in double curly brackets: (`{{1}}`...`{{2}}`...and so on). Example values in template creation payloads and real values in template send payloads must appear in the order in which their corresponding placeholders appear in the component text string.
Templates must have a status of `APPROVED` before they can be sent in template messages. A template's status is initially set by the template review process, but can be changed to another value based on usage and [quality feedback](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-quality).
```

## Added for v0.2 (retrieved 2026-10-16)

```text
You can create a maximum of 100 templates in a WhatsApp Business Account per hour.
Template names are limited to a maximum of 512 characters, consisting of lowercase alphanumeric characters and underscores.
Every template must have a name, but names are not unique. This flexibility allows you to create multiple templates with the same name, but in different languages.
Each template must be categorized as **authentication**, **marketing**, or **utility**. The [template categorization](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization) guide describes how to assign the proper category to a template, and what can happen if a template has been miscategorized.
"category": "utility",
"parameter_format": "named",
      "body_text_named_params": [
          "param_name": "first_name",
      "body_text": [
Template header components can display media assets. If you are creating a template with a media header, you must use the [Resumable Upload API](https://developers.facebook.com/docs/graph-api/guides/upload) to obtain an asset handle, and include this asset handle in your template creation request. The example asset will be reviewed as part of [template review](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-review).
Templates are automatically reviewed upon creation or after editing. If your template is approved, its status is set to `APPROVED` and you can begin sending it in template messages. If it is rejected, or if its status changes to any other value, it cannot be sent in template messages.
Template status changes are communicated via [message_template_status_update](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/message_template_status_update) webhooks, but you can use the [Template API](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/message-template-api#get-version-template-id) and request the `status` field to get the status of a template at any time.
curl 'https://graph.facebook.com/<API_VERSION>/<TEMPLATE_ID>?fields=status' \
"status": "APPROVED",
- **In-Review**: Indicates that the template is still under review. Review can take up to 24 hours.
- **Rejected**: The template has been rejected during the review process or violates one or more policies.
- **Paused**: The template has been paused due to recurring negative feedback from customers, or low read-rates. Message templates with this status cannot be sent to customers. See [Template Pausing](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-pausing).
- **Disabled**: The template has been disabled due to recurring negative feedback from customers. Message templates with this status cannot be sent to customers.
If a parent business portfolio is unverified, each of its WhatsApp Business Accounts is limited to 250 message templates. However, if the portfolio is [verified](https://www.facebook.com/business/help/1095661473946872), and at least one of its WhatsApp Business Accounts has a business phone number with an approved [display name](https://developers.facebook.com/documentation/business-messaging/whatsapp/display-names), each of its WhatsApp Business Accounts can have up to 6,000 templates.
- [Template archival](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-archival) — A process that automatically archives and deletes templates that have been inactive for 12 months or more. Archived templates are deleted after 28 days unless unarchived.
```
