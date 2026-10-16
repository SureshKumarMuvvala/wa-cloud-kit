import { TEST_HEADER_HANDLE } from "../helpers/ids.js";

/** The §2.1 invoice body (v0.2 spec). Ends in static text (F-049). */
export const INVOICE_BODY_TEXT =
  "Hello {{customer_name}}, invoice {{invoice_number}} for {{amount}} is attached and due on {{due_date}}. For any questions contact {{signature}}. Thank you.";

export const INVOICE_CREATE_INPUT = {
  name: "invoice_with_pdf",
  language: "en_US",
  category: "UTILITY",
  header: { format: "DOCUMENT", headerHandle: TEST_HEADER_HANDLE },
  body: {
    text: INVOICE_BODY_TEXT,
    format: "named",
    examples: [
      { name: "customer_name", example: "Alex" },
      { name: "invoice_number", example: "INV-0001" },
      { name: "amount", example: "120.00" },
      { name: "due_date", example: "1 December" },
      { name: "signature", example: "Accounts Team | Example Traders" },
    ],
  },
  footer: { text: "Invoices from Example Traders" },
} as const;

/** The exact wire body for {@link INVOICE_CREATE_INPUT} (v0.2 spec §2.1). */
export const INVOICE_WIRE_BODY = {
  name: "invoice_with_pdf",
  language: "en_US",
  category: "UTILITY",
  parameter_format: "NAMED",
  components: [
    { type: "HEADER", format: "DOCUMENT", example: { header_handle: [TEST_HEADER_HANDLE] } },
    {
      type: "BODY",
      text: INVOICE_BODY_TEXT,
      example: {
        body_text_named_params: [
          { param_name: "customer_name", example: "Alex" },
          { param_name: "invoice_number", example: "INV-0001" },
          { param_name: "amount", example: "120.00" },
          { param_name: "due_date", example: "1 December" },
          { param_name: "signature", example: "Accounts Team | Example Traders" },
        ],
      },
    },
    { type: "FOOTER", text: "Invoices from Example Traders" },
  ],
} as const;

export const CREATE_RESPONSE = { id: "300000000000003", status: "PENDING", category: "UTILITY" };
