import { describe, expect, it } from "vitest";
import { WaValidationError } from "../../src/index.js";
import { jsonResponse } from "../helpers/fake-fetch.js";
import { catchError, testBusinessClient } from "../helpers/business-client.js";
import { TEST_TEMPLATE_ID } from "../helpers/ids.js";

const TEMPLATE = {
  id: TEST_TEMPLATE_ID,
  name: "invoice_with_pdf",
  language: "en_US",
  category: "UTILITY",
  status: "APPROVED",
  future_field: true,
};
const LIST_BASE = "https://graph.facebook.com/v25.0/200000000000002/message_templates";

describe("listTemplates (test 50)", () => {
  it("sends GET with no query by default and parses templates", async () => {
    const { client, fake } = testBusinessClient([jsonResponse({ data: [TEMPLATE] })]);
    const result = await client.listTemplates();
    expect(fake.calls[0]?.url).toBe(LIST_BASE);
    expect(fake.calls[0]?.method).toBe("GET");
    expect(fake.calls[0]?.headers.authorization).toBe("Bearer test-token");
    expect(fake.calls[0]?.headers["content-type"]).toBeUndefined();
    expect(fake.calls[0]?.body).toBeUndefined();
    expect(result.templates).toEqual([TEMPLATE]);
    expect(result.nextCursor).toBeUndefined();
    expect(result.previousCursor).toBeUndefined();
  });

  it("serializes fields, limit, after, before and status", async () => {
    const { client, fake } = testBusinessClient([jsonResponse({ data: [] })]);
    await client.listTemplates({
      fields: ["id", "status", "rejected_reason"],
      limit: 25,
      after: "CURSOR_A",
      before: "CURSOR_B",
      status: "approved",
    });
    const url = new URL(fake.calls[0]?.url ?? "");
    expect(url.pathname).toBe("/v25.0/200000000000002/message_templates");
    expect(url.searchParams.get("fields")).toBe("id,status,rejected_reason");
    expect(url.searchParams.get("limit")).toBe("25");
    expect(url.searchParams.get("after")).toBe("CURSOR_A");
    expect(url.searchParams.get("before")).toBe("CURSOR_B");
    expect(url.searchParams.get("status")).toBe("approved");
  });

  it("takes nextCursor from paging.cursors.after only when paging.next exists", async () => {
    const withNext = {
      data: [TEMPLATE],
      paging: {
        cursors: { before: "B1", after: "A1" },
        next: "https://graph.facebook.com/evil/next",
        previous: "https://graph.facebook.com/evil/prev",
      },
    };
    const withoutNext = { data: [TEMPLATE], paging: { cursors: { before: "B1", after: "A1" } } };
    const { client, fake } = testBusinessClient([
      jsonResponse(withNext),
      jsonResponse(withoutNext),
    ]);
    const first = await client.listTemplates();
    expect(first.nextCursor).toBe("A1");
    expect(first.previousCursor).toBe("B1");
    const second = await client.listTemplates();
    expect(second.nextCursor).toBeUndefined();
    expect(second.previousCursor).toBeUndefined();
    // paging.next is never fetched
    expect(fake.calls).toHaveLength(2);
    expect(fake.calls.every((call) => call.url.startsWith(LIST_BASE))).toBe(true);
  });

  it.each([
    ["empty fields", { fields: [] }],
    ["unknown field", { fields: ["nope"] }],
    ["limit 0", { limit: 0 }],
    ["empty after", { after: "" }],
    ["unknown key", { name: "x" }],
  ])("rejects %s before any request", async (_label, input) => {
    const { client, fake } = testBusinessClient([jsonResponse({ data: [] })]);
    const error = await catchError(client.listTemplates(input as never));
    expect(error).toBeInstanceOf(WaValidationError);
    expect(fake.calls).toHaveLength(0);
  });

  it("raises WaResponseShapeError when data is missing", async () => {
    const { client } = testBusinessClient([jsonResponse({})]);
    const error = await catchError(client.listTemplates());
    expect((error as Error).name).toBe("WaResponseShapeError");
  });
});

describe("getTemplate (test 51)", () => {
  it("GETs /{template-id} with ?fields=status for a status check", async () => {
    const { client, fake } = testBusinessClient([
      jsonResponse({ id: TEST_TEMPLATE_ID, status: "APPROVED" }),
    ]);
    const result = await client.getTemplate({ templateId: TEST_TEMPLATE_ID, fields: ["status"] });
    expect(fake.calls[0]?.url).toBe(
      `https://graph.facebook.com/v25.0/${TEST_TEMPLATE_ID}?fields=status`,
    );
    expect(fake.calls[0]?.method).toBe("GET");
    expect(result).toEqual({ id: TEST_TEMPLATE_ID, status: "APPROVED" });
  });

  it("omits the query without fields", async () => {
    const { client, fake } = testBusinessClient([jsonResponse(TEMPLATE)]);
    await client.getTemplate({ templateId: TEST_TEMPLATE_ID });
    expect(fake.calls[0]?.url).toBe(`https://graph.facebook.com/v25.0/${TEST_TEMPLATE_ID}`);
  });

  it.each(["", "../200000000000002", "a/b", "a?b=1", "a b", "a#b"])(
    "rejects path-unsafe id %j",
    async (templateId) => {
      const { client, fake } = testBusinessClient([jsonResponse(TEMPLATE)]);
      const error = await catchError(client.getTemplate({ templateId }));
      expect(error).toBeInstanceOf(WaValidationError);
      expect(fake.calls).toHaveLength(0);
    },
  );
});
