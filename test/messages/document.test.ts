import { describe, expect, it } from "vitest";
import { WaValidationError, buildDocumentMessage } from "../../src/index.js";
import { sentJson, testClient } from "../helpers/client.js";
import { TEST_RECIPIENT } from "../helpers/ids.js";

describe("document messages (tests 9-10)", () => {
  it("accepts a media id", () => {
    expect(
      buildDocumentMessage({ to: TEST_RECIPIENT, document: { id: "3000000000001" } }),
    ).toStrictEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: TEST_RECIPIENT,
      type: "document",
      document: { id: "3000000000001" },
    });
  });

  it("accepts an http(s) link", () => {
    for (const link of ["https://files.example.com/inv.pdf", "http://files.example.com/inv.pdf"]) {
      expect(
        buildDocumentMessage({ to: TEST_RECIPIENT, document: { link } }).document,
      ).toStrictEqual({
        link,
      });
    }
  });

  it.each([
    ["both id and link", { id: "1", link: "https://files.example.com/a.pdf" }],
    ["neither", {}],
    ["a non-http(s) link", { link: "ftp://files.example.com/a.pdf" }],
    ["a relative link", { link: "/a.pdf" }],
    ["an empty id", { id: "" }],
  ])("rejects %s without calling fetch", async (_label, document) => {
    const { client, fake } = testClient();
    await expect(
      client.sendDocument({ to: TEST_RECIPIENT, document: document as never }),
    ).rejects.toBeInstanceOf(WaValidationError);
    expect(fake.calls).toHaveLength(0);
  });

  it("accepts a 1024-character caption and rejects 1025", () => {
    const base = { to: TEST_RECIPIENT, document: { id: "3000000000001" } };
    expect(buildDocumentMessage({ ...base, caption: "c".repeat(1024) }).document).toMatchObject({
      caption: "c".repeat(1024),
    });
    expect(() => buildDocumentMessage({ ...base, caption: "c".repeat(1025) })).toThrow(
      WaValidationError,
    );
  });

  it("passes filename through and sends via the client", async () => {
    const { client, fake } = testClient();
    await client.sendDocument({
      to: TEST_RECIPIENT,
      document: { id: "3000000000001" },
      caption: "Invoice INV-001",
      filename: "INV-001.pdf",
    });
    expect(sentJson(fake)).toStrictEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: TEST_RECIPIENT,
      type: "document",
      document: { id: "3000000000001", caption: "Invoice INV-001", filename: "INV-001.pdf" },
    });
  });
});
