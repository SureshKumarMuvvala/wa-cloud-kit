# Source excerpt: utility-templates

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/utility-templates/utility-templates.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `87da4d9329ce209b739d950ed7139e80379867e28fdd9772142bfd05c45ae0d1` (20678 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
Utility templates have strict content requirements, particularly around marketing material. If you attempt to create or update a utility template with marketing material, the template will automatically be re-categorized as a marketing template.
| `<API_VERSION>`<br><br>_String_ | **Optional.**<br><br>API version. If omitted, defaults to the newest API version available to your app. | v25.0 |
| `<MEDIA_HEADER_TYPE>`<br><br>_String_ | **Required if template uses a media header component.**<br><br>Media header type. Values can be:<br><br>- document<br>- image<br>- video<br><br>Note that this placeholder appears twice in the request syntax above. | `image` |
```

## Added for v0.2 (retrieved 2026-10-16)

```text
- 1 header (optional; all types supported)
- 1 body
- 1 footer (optional)
  "parameter_format": "<PARAMETER_FORMAT>",
| `<HEADER_ASSET_HANDLE>`<br><br>_String_ | **Required if using a header with a media asset.**<br><br>Asset handle of example media asset uploaded on your WhatsApp Business account.<br><br>Maximum 60 characters. | `4::aW1hZ2UvcG5n:ARYpf5zqqUjggwGfsZOJ2_o26Zs8ntcO2mss2vKpFb8P_IvskL043YXKpehYTD7IxqEB4t-uZcIzOTxOFRavEcN_tZLhk1WXFb3IOr4S8UKJcQ:e:1759093121:634974688087057:100089620928913:ARYyOAh63uQLhDpqOdk\n4::aW1hZ2UvcG5n:ARZW8t9-cBNjpdmxV5Z9wcRAMhfmw4ATpJcJiHT0nY62hXq4ppOeBaTWaGI0IwX-twF2IkeKo-_MyW2pEDuBAE5vyw2oHTNgPZQkntclrgWMGg:e:1759093121:634974688087057:100089620928913:ARZE4NC5MrxnZUe5GRw` |
| `<HEADER_TYPE>`<br><br>_String_ | **Required if using a header.**<br><br>Header format. Values can be:<br><br>- documentation<br>- image<br>- location<br>- text<br>- video | `image` |
| `<TEMPLATE_NAME>`<br><br>_String_ | **Required.**<br><br>Template name. Must be unique, unless existing templates with the same name have a different template language.<br><br>Maximum 512 characters. Lowercase, alphanumeric characters and underscores only. | `reservation_confirmation` |
| `<BODY_TEXT>`<br><br>_String_ | **Required.**<br><br>Template body text. Variables are supported.<br><br>Maximum 1024 characters. | `You're all set! Your reservation for {{number_of_guests}} at Lucky Shrub Eatery on {{day}}, {{date}}, at {{time}}, is confirmed. See you then!` |
  "id": "<TEMPLATE_ID>",
  "status": "<TEMPLATE_STATUS>",
  "status": "PENDING",
  "category": "UTILITY"
```
