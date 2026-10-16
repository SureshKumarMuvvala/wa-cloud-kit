import { describe, expect, it } from "vitest";
import { WaValidationError } from "../../src/index.js";
import { jsonResponse } from "../helpers/fake-fetch.js";
import { catchError, testBusinessClient } from "../helpers/business-client.js";
import { sentJson } from "../helpers/client.js";
import { TEST_TEMPLATE_ID } from "../helpers/ids.js";
import {
  CREATE_RESPONSE,
  INVOICE_BODY_TEXT,
  INVOICE_CREATE_INPUT,
  INVOICE_WIRE_BODY,
} from "../fixtures/templates.js";

function withBody(body: unknown) {
  return { ...INVOICE_CREATE_INPUT, body };
}

describe("createTemplate wire body (tests 45-46)", () => {
  it("emits exactly the spec body: uppercase enums, NAMED, handle (test 45)", async () => {
    const { client, fake } = testBusinessClient([jsonResponse(CREATE_RESPONSE)]);
    const result = await client.createTemplate(INVOICE_CREATE_INPUT);
    expect(fake.calls).toHaveLength(1);
    const call = fake.calls[0];
    expect(call?.url).toBe("https://graph.facebook.com/v25.0/200000000000002/message_templates");
    expect(call?.method).toBe("POST");
    expect(call?.headers.authorization).toBe("Bearer test-token");
    expect(call?.headers["content-type"]).toBe("application/json");
    expect(sentJson(fake)).toEqual(INVOICE_WIRE_BODY);
    expect(result).toEqual({
      templateId: TEST_TEMPLATE_ID,
      status: "PENDING",
      category: "UTILITY",
      raw: CREATE_RESPONSE,
    });
  });

  it("emits body_text and POSITIONAL for positional bodies (test 46)", async () => {
    const { client, fake } = testBusinessClient([jsonResponse(CREATE_RESPONSE)]);
    await client.createTemplate({
      name: "invoice_positional",
      language: "en_US",
      category: "UTILITY",
      body: {
        text: "Hello {{1}}, invoice {{2}} is due. Thank you.",
        format: "positional",
        examples: ["Alex", "INV-0001"],
      },
    });
    expect(sentJson(fake)).toEqual({
      name: "invoice_positional",
      language: "en_US",
      category: "UTILITY",
      parameter_format: "POSITIONAL",
      components: [
        {
          type: "BODY",
          text: "Hello {{1}}, invoice {{2}} is due. Thank you.",
          example: { body_text: [["Alex", "INV-0001"]] },
        },
      ],
    });
  });

  it("emits message_send_ttl_seconds when given", async () => {
    const { client, fake } = testBusinessClient([jsonResponse(CREATE_RESPONSE)]);
    await client.createTemplate({ ...INVOICE_CREATE_INPUT, messageSendTtlSeconds: 3600 });
    expect((sentJson(fake) as { message_send_ttl_seconds: number }).message_send_ttl_seconds).toBe(
      3600,
    );
  });

  it("allows a body with no parameters: no parameter_format and no example", async () => {
    const { client, fake } = testBusinessClient([jsonResponse(CREATE_RESPONSE)]);
    await client.createTemplate({
      name: "plain_notice",
      language: "en_US",
      category: "UTILITY",
      body: { text: "Your invoice is ready." },
    });
    expect(sentJson(fake)).toEqual({
      name: "plain_notice",
      language: "en_US",
      category: "UTILITY",
      components: [{ type: "BODY", text: "Your invoice is ready." }],
    });
  });
});

describe("createTemplate validation sends nothing (test 47)", () => {
  const named = (text: string, names: string[]) => ({
    text,
    format: "named" as const,
    examples: names.map((name) => ({ name, example: "x" })),
  });
  const positional = (text: string, count: number) => ({
    text,
    format: "positional" as const,
    examples: Array.from({ length: count }, () => "x"),
  });

  const cases: readonly (readonly [string, unknown])[] = [
    ["uppercase name", { ...INVOICE_CREATE_INPUT, name: "Invoice" }],
    ["name with a space", { ...INVOICE_CREATE_INPUT, name: "my invoice" }],
    ["513-char name", { ...INVOICE_CREATE_INPUT, name: "a".repeat(513) }],
    ["empty language", { ...INVOICE_CREATE_INPUT, language: "" }],
    ["1025-char body", withBody({ text: "a".repeat(1025) })],
    ["61-char footer", { ...INVOICE_CREATE_INPUT, footer: { text: "f".repeat(61) } }],
    ["duplicate named placeholder", withBody(named("Hi {{a}} and {{a}}. Bye.", ["a", "a"]))],
    ["named placeholder with uppercase", withBody(named("Hi {{Name}}. Bye.", ["Name"]))],
    ["positional gap", withBody(positional("Hi {{1}} and {{3}}. Bye.", 2))],
    ["positional out of order", withBody(positional("Hi {{2}} and {{1}}. Bye.", 2))],
    ["too few examples", withBody(named("Hi {{a}} and {{b}}. Bye.", ["a"]))],
    ["too many examples", withBody(named("Hi {{a}}. Bye.", ["a", "b"]))],
    ["example for the wrong name", withBody(named("Hi {{a}}. Bye.", ["b"]))],
    [
      "empty example",
      withBody({ ...named("Hi {{a}}. Bye.", ["a"]), examples: [{ name: "a", example: "" }] }),
    ],
    ["named format with positional placeholders", withBody(named("Hi {{1}}. Bye.", ["a"]))],
    ["positional format with named placeholders", withBody(positional("Hi {{a}}. Bye.", 1))],
    ["mixed named and positional", withBody(named("Hi {{a}} and {{1}}. Bye.", ["a"]))],
    ["parameters without examples", withBody({ text: "Hi {{a}}. Bye." })],
    ["body starting with a placeholder", withBody(named("{{a}} is due. Bye.", ["a"]))],
    ["body ending with a placeholder", withBody(named("Due: {{a}}", ["a"]))],
    ["trailing placeholder behind whitespace", withBody(named("Due: {{a}}  \n", ["a"]))],
    ["non-UTILITY category", { ...INVOICE_CREATE_INPUT, category: "MARKETING" }],
    [
      "empty headerHandle",
      { ...INVOICE_CREATE_INPUT, header: { format: "DOCUMENT", headerHandle: "" } },
    ],
    [
      "non-DOCUMENT header",
      { ...INVOICE_CREATE_INPUT, header: { format: "IMAGE", headerHandle: "h" } },
    ],
    ["unknown top-level key", { ...INVOICE_CREATE_INPUT, allow_category_change: true }],
    ["zero ttl", { ...INVOICE_CREATE_INPUT, messageSendTtlSeconds: 0 }],
  ];

  it.each(cases)("rejects %s", async (_label, input) => {
    const { client, fake } = testBusinessClient([jsonResponse(CREATE_RESPONSE)]);
    const error = await catchError(client.createTemplate(input as never));
    expect(error).toBeInstanceOf(WaValidationError);
    expect(fake.calls).toHaveLength(0);
  });
});

describe("createTemplate accepted limits (test 48)", () => {
  it("accepts a 1024-char body, a 512-char name, a 60-char footer and a huge headerHandle", async () => {
    const { client, fake } = testBusinessClient([jsonResponse(CREATE_RESPONSE)]);
    const text = `Hi. ${"a".repeat(1024 - "Hi. ".length - " Bye.".length)} Bye.`;
    expect(text).toHaveLength(1024);
    await client.createTemplate({
      name: "a".repeat(512),
      language: "en_US",
      category: "UTILITY",
      header: { format: "DOCUMENT", headerHandle: `4::${"h".repeat(500)}` },
      body: { text },
      footer: { text: "f".repeat(60) },
    });
    expect(fake.calls).toHaveLength(1);
  });

  it("accepts the invoice body text used by the examples", () => {
    expect(INVOICE_BODY_TEXT.trim().endsWith("}}")).toBe(false);
  });
});

describe("createTemplate response (test 49)", () => {
  it("passes a re-categorized MARKETING response through without throwing", async () => {
    const response = { id: TEST_TEMPLATE_ID, status: "PENDING", category: "MARKETING", extra: 1 };
    const { client } = testBusinessClient([jsonResponse(response)]);
    const result = await client.createTemplate(INVOICE_CREATE_INPUT);
    expect(result.category).toBe("MARKETING");
    expect(result.raw).toEqual(response);
  });

  it("raises WaResponseShapeError when id is missing", async () => {
    const { client } = testBusinessClient([
      jsonResponse({ status: "PENDING", category: "UTILITY" }),
    ]);
    const error = await catchError(client.createTemplate(INVOICE_CREATE_INPUT));
    expect((error as Error).name).toBe("WaResponseShapeError");
  });

  it("honours an AbortSignal", async () => {
    const { client, fake } = testBusinessClient([jsonResponse(CREATE_RESPONSE)]);
    const controller = new AbortController();
    await client.createTemplate(INVOICE_CREATE_INPUT, { signal: controller.signal });
    expect(fake.calls[0]?.signal).toBe(controller.signal);
  });
});
