# Source excerpt: tpl-api

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/message-template-api.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `d596d69bf106e788956d2b6626dd25a0c2d4cd0f2611a56019e462c15f711383` (30808 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
| DELETE | [/{Version}/{WABA-ID}/message_templates](#delete-version-waba-id-message-templates) |
| GET | [/{Version}/{TEMPLATE_ID}](#get-version-template-id) |
| GET | [/{Version}/{WABA-ID}/message_templates](#get-version-waba-id-message-templates) |
| POST | [/{Version}/{TEMPLATE_ID}](#post-version-template-id) |
| POST | [/{Version}/{WABA-ID}/message_templates](#post-version-waba-id-message-templates) |
Delete message templates from a WhatsApp Business Account. Can delete by name
(all languages), by specific template ID, or by multiple template IDs.
| name | string |  | Template name to delete (deletes all languages if hsm_id not specified) |
| hsm_id | string |  | Specific template ID to delete (used with name for single-language deletion) |
| hsm_ids | string |  | JSON array of template IDs to delete (max 100) |
| limit | integer [min: 1] |  | Maximum number of templates to return per page |
| after | string |  | Cursor for next page of results |
| before | string |  | Cursor for previous page of results |
| fields | string |  | Comma-separated list of fields to include in the response. Available fields: id, ad_account_id, ad_adset_id, ad_campaign_id, ad_id, bid_spec, category, components, correct_category, cta_url_link_tracking_opted_out, degrees_of_freedom_spec, display_format, health_status, is_primary_device_delivery_only, is_sms_fallback_enabled, language, last_updated_time, library_template_name, message_send_ttl_seconds, name, parameter_format, previous_category, quality_score, rejected_reason, source, status, sub_category |
Retrieve a specific message template by its ID with all available fields.
Create a new message template for a WhatsApp Business Account. Templates must be
approved before they can be used to send messages.
| name | string | ✓ | Template name (lowercase alphanumeric and underscores only) |
| language | string | ✓ | Template language code |
| category | [WhatsAppBusinessHSMTag](#whatsappbusinesshsmtag) | ✓ |  |
| parameter_format | [BusinessMessagingHSMParameterFormat](#businessmessaginghsmparameterformat) |  |  |
| components | array of object |  | Template components |
| sub_category | [WhatsAppBusinessHSMTagSubCategory](#whatsappbusinesshsmtagsubcategory) |  |  |
| message_send_ttl_seconds | integer |  | Time-to-live for messages using this template |
| allow_category_change | boolean |  | Allow Meta to reassign the template category |
Update an existing message template. Only approved or rejected templates can be edited.
**Enum Values**: "AUTHENTICATION", "FREE_SERVICE", "MARKETING", "UTILITY"
**Enum Values**: "APPROVED", "ARCHIVED", "DELETED", "DISABLED", "IN_APPEAL", "LIMIT_EXCEEDED", "PAUSED", "PENDING", "PENDING_DELETION", "REJECTED"
**Enum Values**: "BOOKING_STATUS", "CALL_PERMISSIONS_REQUEST", "FLIGHT_DELAY_AND_GATE_CHANGE_ALERT", "FRAUD_ALERT", "ORDER_DETAILS", "ORDER_STATUS", "RICH_ORDER_STATUS"
**Enum Values**: "NAMED", "POSITIONAL"
**Enum Values**: "GREEN", "RED", "UNKNOWN", "YELLOW"
**Enum Values**: "ABUSIVE_CONTENT", "CATEGORY_NOT_AVAILABLE", "INCORRECT_CATEGORY", "INVALID_FORMAT", "NONE", "PROMOTIONAL", "SCAM", "TAG_CONTENT_MISMATCH"
**Enum Values**: "auto_generated", "manual"
**Enum Values**: "ORDER_DETAILS"
**Enum Values**: "campaign", "direct"
| id | string |  | ID of the created template |
| status | [WhatsAppBusinessHSMStatus](#whatsappbusinesshsmstatus) |  |  |
| data | array of [MessageTemplate](#messagetemplate) |  | Array of message templates |
| cursors | [Cursors](#object-cursors-7) |  |  |
| next | string |  | URL for the next page of results |
| before | string |  | Cursor pointing to the start of the page |
| after | string |  | Cursor pointing to the end of the page |
| rejected_reason | [WhatsAppBusinessHSMRejectionReason](#whatsappbusinesshsmrejectionreason) |  |  |
| success | boolean |  | Whether the operation was successful |
| format | One of "DOCUMENT", "IMAGE", "LOCATION", "TEXT", "VIDEO" |  | Format of the header component |
| type | One of "BODY", "BUTTONS", "CAROUSEL", "FOOTER", "HEADER", "LIMITED_TIME_OFFER" |  | Component type |
| header_handle | array of string |  | Media handle IDs for header media examples |
| Authorization | string | ✓ | Bearer token for API authentication. This should be a valid access token obtained through the appropriate OAuth flow or system user token. |
        "message": "Invalid parameter: name must contain only lowercase alphanumeric characters and underscores",
        "message": "Insufficient permissions to create templates",
| bearerAuth | HTTP Bearer | Header: `Authorization` |
```
