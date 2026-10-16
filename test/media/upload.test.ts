import { describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_BYTES,
  SUPPORTED_UPLOAD_MIME_TYPES,
  WaResponseShapeError,
  WaValidationError,
} from "../../src/index.js";
import { jsonResponse } from "../helpers/fake-fetch.js";
import { testClient } from "../helpers/client.js";

/** A Blob that reports an arbitrary size without allocating it. */
class SizedBlobStub extends Blob {
  readonly #size: number;
  constructor(size: number, type: string) {
    super([], { type });
    this.#size = size;
  }
  override get size(): number {
    return this.#size;
  }
}

const pdf = () => new Blob(["%PDF-1.7 fake"], { type: "application/pdf" });

describe("media upload (tests 21-23)", () => {
  it("sends multipart form-data with messaging_product, type and file (F-060, C-4)", async () => {
    const { client, fake } = testClient([jsonResponse({ id: "3000000000001" })]);
    const result = await client.uploadMedia({
      file: pdf(),
      mimeType: "application/pdf",
      filename: "INV-001.pdf",
    });
    expect(result).toStrictEqual({ mediaId: "3000000000001" });

    const call = fake.calls[0];
    expect(call?.url).toBe("https://graph.facebook.com/v25.0/100000000000001/media");
    expect(call?.method).toBe("POST");
    expect(call?.headers.authorization).toBe("Bearer test-token");
    expect(call?.headers["content-type"]).toBeUndefined();
    const form = call?.body;
    expect(form).toBeInstanceOf(FormData);
    if (!(form instanceof FormData)) return;
    expect(form.get("messaging_product")).toBe("whatsapp");
    expect(form.get("type")).toBe("application/pdf");
    const file = form.get("file");
    expect(file).toBeInstanceOf(File);
    if (!(file instanceof File)) return;
    expect(file.name).toBe("INV-001.pdf");
    expect(file.type).toBe("application/pdf");
    expect(await file.text()).toBe("%PDF-1.7 fake");
    expect([...form.keys()]).toEqual(["messaging_product", "type", "file"]);
  });

  it("types the file part with mimeType even if the Blob has no type", async () => {
    const { client, fake } = testClient([jsonResponse({ id: "3000000000001" })]);
    await client.uploadMedia({
      file: new Blob(["x"]),
      mimeType: "image/png",
      filename: "logo.png",
    });
    const form = fake.calls[0]?.body;
    const file = form instanceof FormData ? form.get("file") : null;
    expect(file instanceof File ? file.type : undefined).toBe("image/png");
  });

  it("exports the D-2 MIME list and limits (F-063)", () => {
    expect([...SUPPORTED_UPLOAD_MIME_TYPES].sort()).toEqual(
      [
        "text/plain",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/pdf",
        "image/jpeg",
        "image/png",
      ].sort(),
    );
    expect(MAX_UPLOAD_BYTES["application/pdf"]).toBe(100_000_000);
    expect(MAX_UPLOAD_BYTES["image/jpeg"]).toBe(5_000_000);
    expect(MAX_UPLOAD_BYTES["image/png"]).toBe(5_000_000);
  });

  it.each(["video/mp4", "audio/mpeg", "image/webp", "application/zip"])(
    "rejects %s without calling fetch (D-2)",
    async (mimeType) => {
      const { client, fake } = testClient();
      await expect(
        client.uploadMedia({ file: new Blob(["x"]), mimeType: mimeType as never, filename: "f" }),
      ).rejects.toBeInstanceOf(WaValidationError);
      expect(fake.calls).toHaveLength(0);
    },
  );

  it.each([
    ["application/pdf", 100_000_000],
    ["image/jpeg", 5_000_000],
    ["image/png", 5_000_000],
  ] as const)(
    "accepts %s at exactly the limit and rejects one byte over",
    async (mimeType, limit) => {
      const ok = testClient([jsonResponse({ id: "3000000000001" })]);
      await expect(
        ok.client.uploadMedia({
          file: new SizedBlobStub(limit, mimeType),
          mimeType,
          filename: "f",
        }),
      ).resolves.toStrictEqual({ mediaId: "3000000000001" });

      const tooBig = testClient();
      await expect(
        tooBig.client.uploadMedia({
          file: new SizedBlobStub(limit + 1, mimeType),
          mimeType,
          filename: "f",
        }),
      ).rejects.toBeInstanceOf(WaValidationError);
      expect(tooBig.fake.calls).toHaveLength(0);
    },
  );

  it("rejects a non-Blob file and an empty filename", async () => {
    const { client, fake } = testClient();
    await expect(
      client.uploadMedia({ file: "data" as never, mimeType: "application/pdf", filename: "f" }),
    ).rejects.toBeInstanceOf(WaValidationError);
    await expect(
      client.uploadMedia({ file: pdf(), mimeType: "application/pdf", filename: "" }),
    ).rejects.toBeInstanceOf(WaValidationError);
    expect(fake.calls).toHaveLength(0);
  });

  it.each([
    ["missing id", {}],
    ["empty id", { id: "" }],
  ])("raises WaResponseShapeError for a %s", async (_label, body) => {
    const { client } = testClient([jsonResponse(body)]);
    await expect(
      client.uploadMedia({ file: pdf(), mimeType: "application/pdf", filename: "f.pdf" }),
    ).rejects.toBeInstanceOf(WaResponseShapeError);
  });
});
