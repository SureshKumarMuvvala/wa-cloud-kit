# Source excerpt: template-categorization

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `113190104a6ebb8d7009059850152526c2537d8d1170c1dc74ebd13e58226e3b` (37003 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
- _Must_ be **non-promotional**, not containing any promotional or persuasive intent.
- _Must_ ALSO be either **specific to or requested by the user** (clearly related to their order, account, services, or transactions) OR **essential or critical** to the user (for example, to ensure user safety).
| **Order Management** | Confirm, update, or cancel an order or transaction with a customer, using specific order or transaction details in the body of your message.<br><br>_These messages should not promote, recommend, upsell, or cross-sell products; include offers; or attempt to secure renewals._ | - Thank you! Your order {{order_number}} is confirmed. We will let you know once your package is on its way.<br>- Hooray! Your package from order {{order_number}} is on its way. Your tracking number is {{tracking_ID}} and expected delivery date is {{date}}.<br>- Unfortunately, one item from your order {{number}} is backordered. We will follow up with an estimated ship date. If you wish to cancel and receive a refund, please click below.<br>- We have received your item from order {{order_number}}. Your refund for ${{amount}} has been processed. Thank you for your business. |
For a utility template to be deemed essential or critical to the user, it must reflect one of the use cases below and must also be non-promotional (not containing any promotional or persuasive intent).
```
