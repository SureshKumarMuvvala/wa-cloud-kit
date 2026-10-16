# Source excerpt: tpl-status-webhook

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/message_template_status_update.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `b473a1e888342b9e1353271da8b2f5b9e4123fba51a285f5842619028a670f01` (10821 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
The **message_template_status_update** webhook notifies you of changes to the status of an existing template.
- A template is approved.
- A template is rejected.
- A template is disabled.
- A template is archived.
- A template is unarchived.
            "event": "<EVENT>",
            "message_template_id": <TEMPLATE_ID>,
            "message_template_name": "<TEMPLATE_NAME>",
            "message_template_language": "<TEMPLATE_LANGUAGE_AND_LOCALE_CODE>",
            "message_template_language": "en-US",
            "message_template_language": "en",
            "reason": "<REASON>",
            "message_template_category": "<TEMPLATE_CATEGORY>",
            "disable_info": {
              "disable_date": "<DISABLE_TIMESTAMP>"
            "other_info": {
            "rejection_info": {
          "field": "message_template_status_update"
| `<EVENT>`<br><br>_String_ | Template status event. Values can be:<br><br>`APPROVED` — Indicates the template has been approved and can now be sent in template messages.<br><br>`ARCHIVED` — Indicates the template has been [archived](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-archival) due to inactivity. Archived templates are scheduled for deletion after 28 days unless unarchived.<br><br>`UNARCHIVED` — Indicates the template has been [unarchived](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-archival) and restored to its previous status.<br><br>`DELETED` — Indicates the template has been deleted.<br><br>`DISABLED` — Indicates the template has been disabled due to user [feedback](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-quality).<br><br>`FLAGGED` — Indicates the template has received negative feedback and is at risk of being disabled.<br><br>`IN_APPEAL` — Indicates the template is in the [appeal](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-review#appeals) process.<br><br>`LIMIT_EXCEEDED` — Indicates the WhatsApp Business Account template is at its [template limit](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview).<br><br>`LOCKED` — Indicates the template has been locked and cannot be edited.<br><br>`PAUSED` — Indicates the template has been [paused](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-pausing).<br><br>`PENDING` — Indicates the template is undergoing template review.<br><br>`REINSTATED` — Indicates the template is no longer flagged or disabled and can be sent in template messages again.<br><br>`PENDING_DELETION` — Indicates template has been deleted via WhatsApp Manager.<br><br>`REJECTED` — Indicates the template has been rejected. You can [edit the template](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview) to have it undergo template review again or [appeal](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-review#appeals) the rejection. | `APPROVED` |
| `<REASON>`<br><br>_String_ | Template rejection reason, if rejected.<br><br>If the template is scheduled for deletion, the value is `null` instead of a string. Otherwise, values can be:<br><br>`ABUSIVE_CONTENT` — Indicates template contains content that violates our policies.<br><br>`CATEGORY_NOT_AVAILABLE` — (Deprecated) Indicates an authentication templates for an unsupported region.<br><br>`INCORRECT_CATEGORY` — Indicates the template's content doesn't match the category designated at the time of template creation.<br><br>`INVALID_FORMAT` — Indicates template has an invalid format.<br><br>`NONE` — Indicates template was paused.<br><br>`PROMOTIONAL` — Indicates template contains content that violates our policies.<br><br>`SCAM` — Indicates template contains content that violates our policies.<br><br>`TAG_CONTENT_MISMATCH` — Indicates the template's content doesn't match the category designated at the time of template creation. | `INVALID_FORMAT` |
| `<TITLE>`<br><br>_String_ | Title of template pause or unpause event.<br><br>Values can be:<br><br>`FIRST_PAUSE` — Indicates template has been paused for the first time.<br><br>`SECOND_PAUSE` — Indicates the template has been paused a second time.<br><br>`RATE_LIMITING_PAUSE` — Indicates template has been paused due to rate limiting.<br><br>`UNPAUSE` — Indicates template has been unpaused.<br><br>`DISABLED` — Indicates template has been disabled. | `FIRST_PAUSE` |
| `<MESSAGE_TEMPLATE_CATEGORY>`<br><br>_String_ | The template category.<br><br>Values can be:<br><br>`MARKETING` — Indicates template is categorized as MARKETING.<br><br>`UTILITY` — Indicates the template is categorized as UTILITY.<br><br>`AUTHENTICATION` — Indicates template is categorized as AUTHENTICATION. | `MARKETING` |
| `<REASON_INFO>`<br><br>_String_ | Provides a detailed explanation for why the template was rejected. This field describes the specific issue detected in the template content. | `Your template has parameters placed next to each other (like {{1}}{{2}}) without text or punctuation between them.` |
| `<RECOMMENDATION_INFO>`<br><br>_String_ | Offers actionable guidance on how to modify the template to resolve the rejection reason. This field suggests best practices for editing the template content. | `Separate parameters with descriptive text and ensure each parameter is clearly contextualized.` |
| `<DISABLE_TIMESTAMP>`<br><br>_Integer_ | Unix timestamp indicating when the template was disabled. | `1751234563` |
| `<TEMPLATE_ID>`<br><br>_Integer_ | Template ID. | `1689556908129832` |
            "event": "REJECTED",
            "reason": "INVALID_FORMAT",
            "event": "APPROVED",
            "reason": "NONE",
```
