import { describe, expect, it } from "vitest";
import { WaApiError, WaResponseShapeError, WaValidationError } from "../../src/index.js";
import { jsonResponse } from "../helpers/fake-fetch.js";
import { catchError } from "../helpers/business-client.js";
import { testClient } from "../helpers/client.js";
import { TEST_MEDIA_ID } from "../helpers/ids.js";

const MEDIA_URL = "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1";
const MEDIA_RESPONSE = {
  messaging_product: "whatsapp",
  url: MEDIA_URL,
  mime_type: "application/pdf",
  sha256: "abc",
  file_size: "1234",
  id: TEST_MEDIA_ID,
};

describe("getMediaUrl (test 55)", () => {
  it("GETs /{media-id}?phone_number_id=… and parses the response", async () => {
    const { client, fake } = testClient([jsonResponse(MEDIA_RESPONSE)]);
    const result = await client.getMediaUrl({ mediaId: TEST_MEDIA_ID });
    expect(fake.calls[0]?.method).toBe("GET");
    expect(fake.calls[0]?.url).toBe(
      `https://graph.facebook.com/v25.0/${TEST_MEDIA_ID}?phone_number_id=100000000000001`,
    );
    expect(fake.calls[0]?.headers.authorization).toBe("Bearer test-token");
    expect(fake.calls[0]?.headers["content-type"]).toBeUndefined();
    expect(result).toEqual({
      mediaId: TEST_MEDIA_ID,
      url: MEDIA_URL,
      mimeType: "application/pdf",
      sha256: "abc",
      fileSize: 1234,
      raw: MEDIA_RESPONSE,
    });
  });

  it("leaves fileSize undefined for a non-numeric file_size", async () => {
    const { client } = testClient([jsonResponse({ ...MEDIA_RESPONSE, file_size: "big" })]);
    expect((await client.getMediaUrl({ mediaId: TEST_MEDIA_ID })).fileSize).toBeUndefined();
  });

  it("omits optional fields that Meta did not send", async () => {
    const { client } = testClient([jsonResponse({ id: TEST_MEDIA_ID, url: MEDIA_URL })]);
    const result = await client.getMediaUrl({ mediaId: TEST_MEDIA_ID });
    expect(Object.keys(result).sort()).toEqual(["mediaId", "raw", "url"]);
  });

  it("raises WaResponseShapeError for a non-https url", async () => {
    const { client } = testClient([
      jsonResponse({ ...MEDIA_RESPONSE, url: "http://lookaside.fbsbx.com/x" }),
    ]);
    expect(await catchError(client.getMediaUrl({ mediaId: TEST_MEDIA_ID }))).toBeInstanceOf(
      WaResponseShapeError,
    );
  });

  it.each(["", "a/b", "../x", "a?b", "a b"])("rejects path-unsafe id %j", async (mediaId) => {
    const { client, fake } = testClient([jsonResponse(MEDIA_RESPONSE)]);
    expect(await catchError(client.getMediaUrl({ mediaId }))).toBeInstanceOf(WaValidationError);
    expect(fake.calls).toHaveLength(0);
  });

  it("maps a Graph error envelope to WaApiError", async () => {
    const { client } = testClient([
      jsonResponse({ error: { message: "(#100) Unsupported get request", code: 100 } }, 400),
    ]);
    expect(await catchError(client.getMediaUrl({ mediaId: TEST_MEDIA_ID }))).toBeInstanceOf(
      WaApiError,
    );
  });
});

describe("deleteMedia (test 62)", () => {
  it("sends DELETE with phone_number_id, no body and no Content-Type", async () => {
    const { client, fake } = testClient([jsonResponse({ success: true })]);
    const result = await client.deleteMedia({ mediaId: TEST_MEDIA_ID });
    expect(fake.calls[0]?.method).toBe("DELETE");
    expect(fake.calls[0]?.url).toBe(
      `https://graph.facebook.com/v25.0/${TEST_MEDIA_ID}?phone_number_id=100000000000001`,
    );
    expect(fake.calls[0]?.body).toBeUndefined();
    expect(fake.calls[0]?.headers["content-type"]).toBeUndefined();
    expect(result).toEqual({ success: true, raw: { success: true } });
  });

  it("rejects an unsafe id and a missing success flag", async () => {
    const { client, fake } = testClient([jsonResponse({})]);
    expect(await catchError(client.deleteMedia({ mediaId: "a/b" }))).toBeInstanceOf(
      WaValidationError,
    );
    expect(fake.calls).toHaveLength(0);
    expect(await catchError(client.deleteMedia({ mediaId: TEST_MEDIA_ID }))).toBeInstanceOf(
      WaResponseShapeError,
    );
  });
});

describe("downloadMediaById", () => {
  it("gets the URL then downloads it with the token", async () => {
    const { client, fake } = testClient([
      jsonResponse(MEDIA_RESPONSE),
      new Response("PDFDATA", { status: 200, headers: { "content-type": "application/pdf" } }),
    ]);
    const result = await client.downloadMediaById({ mediaId: TEST_MEDIA_ID });
    expect(fake.calls).toHaveLength(2);
    expect(fake.calls[1]?.url).toBe(MEDIA_URL);
    expect(fake.calls[1]?.headers.authorization).toBe("Bearer test-token");
    expect(await result.body.text()).toBe("PDFDATA");
    expect(result.contentType).toBe("application/pdf");
    expect(result.size).toBe(7);
  });

  it("does not download when the returned URL is off the allow-list", async () => {
    const { client, fake } = testClient([
      jsonResponse({ ...MEDIA_RESPONSE, url: "https://evil.test/x" }),
    ]);
    expect(await catchError(client.downloadMediaById({ mediaId: TEST_MEDIA_ID }))).toBeInstanceOf(
      WaValidationError,
    );
    expect(fake.calls).toHaveLength(1);
  });
});
