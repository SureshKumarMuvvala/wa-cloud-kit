# Source excerpt: reply-buttons

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-reply-buttons-messages.md>
- Retrieved: 2026-10-18
- Format: Markdown (HTML entities decoded)
- Raw sha256: `699df9aa72416f151fc990a8429512b676aa67dfcd1910709b7fd0e4aeb82b57` (9357 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
Interactive reply buttons messages allow you to send up to three predefined replies for users to choose from.
    "type": "button",
      "buttons": [
          "type": "reply",
            "id": "<BUTTON_ID>",
            "title": "<BUTTON_LABEL_TEXT>"
        <!-- Additional buttons would go here (maximum 3) -->
| `<BODY_TEXT>`<br><br>_String_ | **Required.**<br><br>Body text. URLs are automatically hyperlinked.<br><br>Maximum 1024 characters. | `Hi Pablo! Your gardening workshop is scheduled for 9am tomorrow. Use the buttons if you need to reschedule. Thank you!` |
| `<BUTTON_ID>`<br><br>_String_ | **Required.**<br><br>A unique identifier for each button. Supports up to 3 buttons.<br><br>Maximum 256 characters. | `change-button` |
| `<BUTTON_LABEL_TEXT>`<br><br>_String_ | **Required.**<br><br>Button label text. Must be unique if using multiple buttons.<br><br>Maximum 20 characters. | `Change` |
| `<FOOTER_TEXT>`<br><br>_String_ | **Required if using a footer.**<br><br>Footer text. URLs are automatically hyperlinked.<br><br>Maximum 60 characters. | `Lucky Shrub: Your gateway to succulents!™` |
| `<MESSAGE_HEADER>`<br><br>_JSON Object_ | **Optional.**<br><br>Header content. Supports the following types:<br><br>* `document`<br>* `image`<br>* `text`<br>* `video`<br><br>Media assets can be sent using their [uploaded media](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media#upload-media) `id` or URL `link` (not recommended). | Image header example using uploaded media ID (same basic structure for all media types):<br>`{ "type": "image", "image": { "id": "2762702990552401" }`<br><br><br>Image header example using hosted media:<br>`{ "type": "image", "image": { "link": "https://www.luckyshrub.com/media/workshop-banner.png" }`<br><br><br>Text header example:<br>`{ "type":"text", "text": "Workshop Details" }`<br> |
When a WhatsApp user taps on a reply button, a **messages** webhook is triggered that describes their selection in a `button_reply` object:
```
