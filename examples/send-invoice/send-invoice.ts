// Send an invoice PDF with a tenant signature (v0.2 spec §6.2).
//
// Run `pnpm build` first: this imports the built package from ../../dist.
//
//   WA_TOKEN=... WA_PHONE_NUMBER_ID=... WA_WABA_ID=... WA_API_VERSION=v26.0 \
//   WA_TEMPLATE_ID=... node examples-dist/send-invoice/send-invoice.js invoice.pdf +15550000001
//
// The template ("invoice_with_pdf") must already be APPROVED. invoice-template.json
// holds the body to create it with createTemplate; creating it needs a
// caller-obtained header sample handle (D-6).
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { createWaBusinessClient, createWaClient, renderSignatureParameter } from "wa-cloud-kit";

function env(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    console.error(`Set ${name} before running this example.`);
    process.exit(1);
  }
  return value;
}

const [pdfPath, recipient] = process.argv.slice(2);
if (pdfPath === undefined || recipient === undefined) {
  console.error("Usage: send-invoice <invoice.pdf> <recipient, e.g. +15550000001>");
  process.exit(1);
}

// Per-tenant config. The library keeps no state: build clients from it per request.
const accessToken = env("WA_TOKEN");
const graphApiVersion = env("WA_API_VERSION");
const wa = createWaClient({
  phoneNumberId: env("WA_PHONE_NUMBER_ID"),
  accessToken,
  graphApiVersion,
});
const business = createWaBusinessClient({
  wabaId: env("WA_WABA_ID"),
  accessToken,
  graphApiVersion,
});

// 1. Stop unless the template is APPROVED, the only sendable state (F-040).
const template = await business.getTemplate({
  templateId: env("WA_TEMPLATE_ID"),
  fields: ["status"],
});
if (template.status !== "APPROVED") {
  console.error(`Template status is ${template.status ?? "unknown"}; it must be APPROVED.`);
  process.exit(1);
}

// 2. Upload the PDF (F-060, F-063). This media id is for sending; the header
// sample handle used at template creation is a different value (C-8).
const bytes = await readFile(pdfPath);
const { mediaId } = await wa.uploadMedia({
  file: new Blob([bytes], { type: "application/pdf" }),
  mimeType: "application/pdf",
  filename: basename(pdfPath),
});

// 3. Send the template with the PDF in the header and the signature in the body (F-046).
const result = await wa.sendTemplate({
  to: recipient,
  name: "invoice_with_pdf",
  languageCode: "en_US",
  header: { document: { id: mediaId } },
  body: {
    format: "named",
    parameters: [
      { type: "text", parameter_name: "customer_name", text: "Alex" },
      { type: "text", parameter_name: "invoice_number", text: "INV-0001" },
      { type: "text", parameter_name: "amount", text: "120.00" },
      { type: "text", parameter_name: "due_date", text: "1 December" },
      renderSignatureParameter({
        signature: { name: "Accounts Team", company: "Example Traders" },
        parameterName: "signature",
      }),
    ],
  },
});

// Success means the request was accepted, not delivered. Follow the `messages`
// webhook for delivery status (F-012).
console.log(`Accepted: ${result.messageId}`);
