import { describe, expect, it } from "vitest";
import { WaValidationError } from "../../src/index.js";
import { jsonResponse } from "../helpers/fake-fetch.js";
import { catchError, testBusinessClient } from "../helpers/business-client.js";
import { TEST_TEMPLATE_ID } from "../helpers/ids.js";

const BASE = "https://graph.facebook.com/v25.0/200000000000002/message_templates";

function query(fake: { calls: { url: string }[] }): URLSearchParams {
  return new URL(fake.calls[0]?.url ?? "").searchParams;
}

describe("deleteTemplate (test 52)", () => {
  it("deletes by name (all languages)", async () => {
    const { client, fake } = testBusinessClient([jsonResponse({ success: true })]);
    const result = await client.deleteTemplate({ name: "invoice_with_pdf" });
    expect(fake.calls[0]?.method).toBe("DELETE");
    expect(fake.calls[0]?.url).toBe(`${BASE}?name=invoice_with_pdf`);
    expect(fake.calls[0]?.body).toBeUndefined();
    expect(fake.calls[0]?.headers["content-type"]).toBeUndefined();
    expect(fake.calls[0]?.headers.authorization).toBe("Bearer test-token");
    expect(result).toEqual({ success: true, raw: { success: true } });
  });

  it("deletes by name + templateId as hsm_id", async () => {
    const { client, fake } = testBusinessClient([jsonResponse({ success: true })]);
    await client.deleteTemplate({ name: "invoice_with_pdf", templateId: TEST_TEMPLATE_ID });
    const q = query(fake);
    expect(q.get("name")).toBe("invoice_with_pdf");
    expect(q.get("hsm_id")).toBe(TEST_TEMPLATE_ID);
    expect(q.get("hsm_ids")).toBeNull();
  });

  it("deletes by ids as a JSON array in hsm_ids, URL-encoded", async () => {
    const { client, fake } = testBusinessClient([jsonResponse({ success: true })]);
    await client.deleteTemplate({ templateIds: ["1", "2"] });
    expect(fake.calls[0]?.url).toBe(`${BASE}?hsm_ids=${encodeURIComponent('["1","2"]')}`);
    expect(query(fake).get("hsm_ids")).toBe('["1","2"]');
    expect(query(fake).get("name")).toBeNull();
  });

  it("accepts 100 ids and rejects 101", async () => {
    const ids = (n: number) => Array.from({ length: n }, (_, i) => String(i + 1));
    const ok = testBusinessClient([jsonResponse({ success: true })]);
    await ok.client.deleteTemplate({ templateIds: ids(100) });
    expect(ok.fake.calls).toHaveLength(1);

    const bad = testBusinessClient([jsonResponse({ success: true })]);
    expect(await catchError(bad.client.deleteTemplate({ templateIds: ids(101) }))).toBeInstanceOf(
      WaValidationError,
    );
    expect(bad.fake.calls).toHaveLength(0);
  });

  it.each([
    ["empty ids", { templateIds: [] }],
    ["empty id string", { templateIds: [""] }],
    ["name with templateIds", { name: "invoice_with_pdf", templateIds: ["1"] }],
    ["templateId without name", { templateId: "1" }],
    ["invalid name", { name: "Bad Name" }],
    ["empty input", {}],
    ["unknown key", { name: "invoice_with_pdf", extra: 1 }],
  ])("rejects %s before any request", async (_label, input) => {
    const { client, fake } = testBusinessClient([jsonResponse({ success: true })]);
    const error = await catchError(client.deleteTemplate(input as never));
    expect(error).toBeInstanceOf(WaValidationError);
    expect(fake.calls).toHaveLength(0);
  });

  it("raises WaResponseShapeError when success is missing", async () => {
    const { client } = testBusinessClient([jsonResponse({})]);
    const error = await catchError(client.deleteTemplate({ name: "invoice_with_pdf" }));
    expect((error as Error).name).toBe("WaResponseShapeError");
  });

  it("surfaces an unknown name as WaApiError (G-13)", async () => {
    const { client } = testBusinessClient([
      jsonResponse({ error: { message: "(#100) Template not found", code: 100 } }, 400),
    ]);
    const error = await catchError(client.deleteTemplate({ name: "does_not_exist" }));
    expect((error as Error).name).toBe("WaApiError");
  });
});
