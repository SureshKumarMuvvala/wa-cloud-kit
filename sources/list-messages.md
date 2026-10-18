# Source excerpt: list-messages

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-list-messages.md>
- Retrieved: 2026-10-18
- Format: Markdown (HTML entities decoded)
- Raw sha256: `3c38ac17829f288888376fa7f02fb50e0138a49415030aadaf763a833185280a` (10222 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
Interactive list messages support up to 10 sections, with up to 10 rows for all sections combined, and can include an optional header and footer.
    "type": "list",
      "button": "<BUTTON_TEXT>",
      "sections": [
          "title": "<SECTION_TITLE_TEXT>",
          "rows": [
              "id": "<ROW_ID>",
              "title": "<ROW_TITLE_TEXT>",
              "description": "<ROW_DESCRIPTION_TEXT>"
| `<BUTTON_TEXT>`<br><br>_String_ | **Required.**<br><br>Button label text. When tapped, reveals rows (options the WhatsApp user can tap). Supports a single button.<br><br>Maximum 20 characters. | `Shipping Options` |
| `<MESSAGE_BODY_TEXT>`<br><br>_String_ | **Required.**<br><br>Message body text. Supports URLs.<br><br>Maximum 4096 characters. | `Which shipping option do you prefer?` |
| `<MESSAGE_FOOTER_TEXT>`<br><br>_String_ | **Optional.**<br><br>Message footer text.<br><br>Maximum 60 characters. | `Lucky Shrub: Your gateway to succulents™` |
| `<MESSAGE_HEADER_TEXT>`<br><br>_String_ | **Optional.**<br><br>The `header` object is optional. Supports `text` header type only.<br><br>Maximum 60 characters. | `Choose Shipping Option` |
| `<ROW_DESCRIPTION_TEXT>`<br><br>_String_ | **Optional.**<br><br>Row description.<br><br>Maximum 72 characters. | `Next Day to 2 Days` |
| `<ROW_ID>`<br><br>_String_ | **Required.**<br><br>Arbitrary string identifying the row. This ID will be included in the webhook payload if the user submits the selection.<br><br>At least one row is required. Supports up to 10 rows.<br><br>Maximum 200 characters. | `priority_express` |
| `<ROW_TITLE_TEXT>`<br><br>_String_ | **Required.**<br><br>Row title. At least 1 row is required. Supports up to 10 rows.<br><br>Maximum 24 characters. | `Priority Mail Express` |
| `<SECTION_TITLE_TEXT>`<br><br>_String_ | **Required.**<br><br>Section title text. At least 1 section is required. Supports up to 10 sections.<br><br>Maximum 24 characters. | `I want it ASAP!` |
```
