# Source excerpt: incoming-webhook-payload

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/webhooks/whatsapp-incoming-webhook-payload.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `d5614db1e8d1eadf05f36b9e3e81ff19e978ebed513bc8991c242f15150d0191` (17043 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
| object | string | ✓ | Always 'whatsapp_business_account' for these webhooks. |
| id | string | ✓ | WhatsApp Business Account ID. |
| changes | array of [Change](#change) | ✓ |  |
| value | Must be one of: [IncomingMessageValueGeneral](#incomingmessagevaluegeneral), [IncomingMessageValueSystem](#incomingmessagevaluesystem), [StatusMessageValue](#statusmessagevalue), [GroupValue](#groupvalue) | ✓ |  |
| field | One of "messages", "group_lifecycle_update", "group_settings_update", "group_participant_update" | ✓ | The field indicate to what object is the webhook related: - messages: the webhook is related to messages from consumer or status of message sent by business to consumer. - group_lifecycle_update: the webhook is related to group creation and deletion. - group_settings_update: the webhook is related to group settings update. - group_participant_update: the webhook is related to participants joining and leaving the groups. |
| display_phone_number | string | ✓ | Business display phone number. |
| phone_number_id | string | ✓ | Business phone number ID. |
| profile | [Profile](#object-profile-1) | ✓ |  |
| wa_id | string |  | WhatsApp user ID. Note that a WhatsApp user's ID and phone number may not always match. |
| contacts | array of [ContactProfile](#contactprofile) | ✓ | Array of contact profiles for the sender. Included for all non-system incoming messages. |
| messages | array of [IncomingMessage](#incomingmessage) | ✓ | Array of message objects. The structure varies based on the 'type' property. |
| messages | array of [SystemMessage](#systemmessage) | ✓ | Array containing only 'system' message objects. |
| statuses | array of [Statuses](#statuses) | ✓ | Array of status objects. |
| id | string | ✓ | Unique WhatsApp message ID the status is associated with. |
| status | One of "sent", "delivered", "read", "failed" | ✓ |  |
| timestamp | string | ✓ |  |
| recipient_id | string | ✓ | Recipient phone number. |
| errors | array of [StatusError](#statuserror) |  |  |
| id | string |  |  |
| billable | boolean |  |  |
| pricing_model | One of "CBP", "PMP" |  |  |
| category | string |  |  |
| code | integer |  |  |
| title | string |  |  |
| message | string |  |  |
| error_data | [ErrorData](#errordata) |  |  |
| href | string |  |  |
| details | string |  |  |
| timestamp | integer | ✓ | Unix timestamp of the group event |
| wa_id | string |  | WhatsApp ID of the participant |
| from | string | ✓ | WhatsApp user phone number. Note that a WhatsApp user's phone number and ID may not always match. |
| id | string | ✓ | Unique WhatsApp message ID. |
| timestamp | string | ✓ | Unix timestamp indicating when the webhook was triggered. |
| from | string | ✓ | Business display phone number. |
| id | string | ✓ | WhatsApp message ID of the message the user used to access the "Message business" button. |
| id | string | ✓ | Media asset ID. A GET request on this ID can provide the asset URL. |
| name | [Name](#object-name-6) |  |  |
| name | string | ✓ | WhatsApp user's name as it appears in their profile in the WhatsApp client. |
| title | string |  | Contact's job title |
| wa_id | string |  | Contact's WhatsApp Number. Note that a WhatsApp user's ID and phone number may not always match. |
| id | string | ✓ | Row ID. |
| title | string | ✓ | Row title. |
| id | string | ✓ | Button ID. |
| title | string | ✓ | Button label text. |
```
