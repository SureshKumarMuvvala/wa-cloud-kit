# Source excerpt: tpl-management

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-management.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `f6e5cba1d7711a31ef21cfe94b12600cf2a58803b63894f59dcc946d75d47c9f` (17603 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
Use the [Message Templates API](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/message-template-api#get-version-waba-id-message-templates) to get a list of templates in a WhatsApp Business account.
curl 'https://graph.facebook.com/v23.0/102290129340398/message_templates?fields=name,category,status&limit=5' \
Example request to get all approved templates and their name, category, and status (swap `status=approved` with `status=rejected` to get rejected templates instead):
curl 'https://graph.facebook.com/v23.0/102290129340398/message_templates?fields=name,category,status&status=approved' \
    "next": "https://graph.facebook.com/v23.0/10229..."
Template names can only contain lowercase alphanumeric characters and underscores (regex: `^[a-z0-9_]+$`). The maximum length is 512 characters. If a name contains uppercase letters, spaces, or special characters, the API returns error code `100`.
Template names must be unique within a WhatsApp Business account for each language. Creating a template with a name that already exists for the same language returns error code `100`, subcode `2388024`, with message "Content in This Language Already Exists".
The API validates template parameters at creation time. Invalid categories or unsupported [language codes](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/supported-languages) return error code `100`. Starting with v23.0, template component parameter issues at send time return error code `132018`.
- Only templates with an `APPROVED`, `REJECTED`, or `PAUSED` status can be edited.
This endpoint requires the `whatsapp_business_management` permission. If you only have the `whatsapp_business_messaging` permission, the API returns error code `200`.
If a template with the specified name does not exist, the API returns an error.
- If you delete a template that has been sent in a template message but has yet to be delivered (for example, because the WhatsApp user's phone is turned off), the template's status is set to `PENDING_DELETION` and WhatsApp attempts delivery for 30 days.
- If you delete an approved template, you cannot create a new template with the same name for 30 days.
- Templates that are in a disabled status cannot be deleted.
Deleting a template by name deletes all templates that match that name (meaning templates with the same name but different languages will also be deleted).
curl -X DELETE 'https://graph.facebook.com/v23.0/102290129340398/message_templates?name=order_confirmation' \
To delete a template by ID, include the template's ID along with its name in your request; only the template with the matching template ID will be deleted.
curl -X DELETE 'https://graph.facebook.com/v23.0/102290129340398/message_templates?hsm_id=1407680676729941&name=order_confirmation' \
The `hsm_ids` parameter cannot be combined with the `name` or `hsm_id` parameters. If any of the template IDs are invalid, the entire request fails and no templates are deleted.
To delete multiple templates at once, include an array of template IDs in the `hsm_ids` query parameter. You can include up to 100 template IDs per request.
curl -X DELETE 'https://graph.facebook.com/v23.0/102290129340398/message_templates?hsm_ids=[1387372356726668,1304694804498707]' \
  "success": true
```
