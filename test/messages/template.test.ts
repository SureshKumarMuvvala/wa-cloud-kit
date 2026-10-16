import { describe, expect, it } from "vitest";
import {
  WaValidationError,
  buildTemplateMessage,
  type SendTemplateInput,
} from "../../src/index.js";
import { sentJson, testClient } from "../helpers/client.js";
import { TEST_RECIPIENT } from "../helpers/ids.js";

const base = { to: TEST_RECIPIENT, name: "invoice_ready", languageCode: "en_US" } as const;

describe("template messages: named body (test 11)", () => {
  it("emits parameter_name for named parameters", () => {
    const payload = buildTemplateMessage({
      ...base,
      body: {
        format: "named",
        parameters: [
          { type: "text", parameter_name: "customer_name", text: "Asha" },
          { type: "text", parameter_name: "invoice_no", text: "INV-001" },
        ],
      },
    });
    expect(payload.template.components).toStrictEqual([
      {
        type: "body",
        parameters: [
          { type: "text", parameter_name: "customer_name", text: "Asha" },
          { type: "text", parameter_name: "invoice_no", text: "INV-001" },
        ],
      },
    ]);
  });

  it("rejects duplicate names", () => {
    expect(() =>
      buildTemplateMessage({
        ...base,
        body: {
          format: "named",
          parameters: [
            { type: "text", parameter_name: "amount", text: "1" },
            { type: "text", parameter_name: "amount", text: "2" },
          ],
        },
      }),
    ).toThrow(WaValidationError);
  });

  it.each(["Customer", "customer1", "customer-name", ""])("rejects the name %j", (name) => {
    expect(() =>
      buildTemplateMessage({
        ...base,
        body: { format: "named", parameters: [{ type: "text", parameter_name: name, text: "x" }] },
      }),
    ).toThrow(WaValidationError);
  });

  it("rejects mixing a positional parameter into a named body", () => {
    expect(() =>
      buildTemplateMessage({
        ...base,
        body: { format: "named", parameters: [{ type: "text", text: "x" }] },
      } as never),
    ).toThrow(WaValidationError);
  });

  it("rejects an empty parameter list and an empty text value", () => {
    expect(() =>
      buildTemplateMessage({ ...base, body: { format: "named", parameters: [] } }),
    ).toThrow(WaValidationError);
    expect(() =>
      buildTemplateMessage({
        ...base,
        body: { format: "positional", parameters: [{ type: "text", text: "" }] },
      }),
    ).toThrow(WaValidationError);
  });
});

describe("template messages: positional body (test 12)", () => {
  it("preserves order and serializes currency and date_time (F-048)", () => {
    const payload = buildTemplateMessage({
      ...base,
      body: {
        format: "positional",
        parameters: [
          { type: "text", text: "Asha" },
          {
            type: "currency",
            currency: { fallback_value: "₹1,250.50", code: "INR", amount_1000: 1250500 },
          },
          { type: "date_time", date_time: { fallback_value: "October 16, 2026" } },
          { type: "text", text: "INV-001" },
        ],
      },
    });
    expect(payload.template.components).toStrictEqual([
      {
        type: "body",
        parameters: [
          { type: "text", text: "Asha" },
          {
            type: "currency",
            currency: { fallback_value: "₹1,250.50", code: "INR", amount_1000: 1250500 },
          },
          { type: "date_time", date_time: { fallback_value: "October 16, 2026" } },
          { type: "text", text: "INV-001" },
        ],
      },
    ]);
  });

  it("rejects a non-integer amount_1000 and a named parameter in a positional body", () => {
    expect(() =>
      buildTemplateMessage({
        ...base,
        body: {
          format: "positional",
          parameters: [
            { type: "currency", currency: { fallback_value: "1", code: "INR", amount_1000: 1.5 } },
          ],
        },
      }),
    ).toThrow(WaValidationError);
    expect(() =>
      buildTemplateMessage({
        ...base,
        body: {
          format: "positional",
          parameters: [{ type: "text", parameter_name: "a", text: "x" }],
        },
      } as never),
    ).toThrow(WaValidationError);
  });
});

describe("template messages: document header (test 13)", () => {
  it.each([
    ["id", { id: "3000000000001" }],
    ["link", { link: "https://files.example.com/INV-001.pdf" }],
  ])("emits a document header by %s (F-046, F-047)", (_label, document) => {
    const payload = buildTemplateMessage({ ...base, header: { document } });
    expect(payload.template.components).toStrictEqual([
      { type: "header", parameters: [{ type: "document", document }] },
    ]);
  });

  it("rejects filename on the header document (G-1, D-4)", () => {
    expect(() =>
      buildTemplateMessage({
        ...base,
        header: { document: { id: "3000000000001", filename: "INV-001.pdf" } },
      } as never),
    ).toThrow(WaValidationError);
  });

  it("rejects a header document with both id and link", () => {
    expect(() =>
      buildTemplateMessage({
        ...base,
        header: { document: { id: "1", link: "https://files.example.com/a.pdf" } },
      }),
    ).toThrow(WaValidationError);
  });
});

describe("template messages: shape (test 14)", () => {
  it("omits components when there is no header and no body", () => {
    expect(buildTemplateMessage(base)).toStrictEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: TEST_RECIPIENT,
      type: "template",
      template: { name: "invoice_ready", language: { code: "en_US" } },
    });
  });

  it("rejects an empty name or language code", () => {
    expect(() => buildTemplateMessage({ ...base, name: "" })).toThrow(WaValidationError);
    expect(() => buildTemplateMessage({ ...base, languageCode: "" })).toThrow(WaValidationError);
  });

  it("sends through the client with header before body", async () => {
    const { client, fake } = testClient();
    const input: SendTemplateInput = {
      ...base,
      replyToMessageId: "wamid.TESTREPLY",
      header: { document: { id: "3000000000001" } },
      body: { format: "positional", parameters: [{ type: "text", text: "Asha" }] },
    };
    await client.sendTemplate(input);
    expect(sentJson(fake)).toStrictEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: TEST_RECIPIENT,
      context: { message_id: "wamid.TESTREPLY" },
      type: "template",
      template: {
        name: "invoice_ready",
        language: { code: "en_US" },
        components: [
          { type: "header", parameters: [{ type: "document", document: { id: "3000000000001" } }] },
          { type: "body", parameters: [{ type: "text", text: "Asha" }] },
        ],
      },
    });
  });

  it("rejects invalid input without calling fetch", async () => {
    const { client, fake } = testClient();
    await expect(client.sendTemplate({ ...base, name: "" })).rejects.toBeInstanceOf(
      WaValidationError,
    );
    expect(fake.calls).toHaveLength(0);
  });
});
