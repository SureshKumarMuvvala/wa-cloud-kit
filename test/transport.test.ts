import { describe, expect, it } from "vitest";
import { z } from "zod";
import { WaApiError, WaHttpError, WaResponseShapeError, WaTransportError } from "../src/index.js";
import { resolveConfig } from "../src/config.js";
import { request } from "../src/transport.js";
import { fakeFetch, jsonResponse, textResponse, type FakeReply } from "./helpers/fake-fetch.js";
import { TEST_PHONE_NUMBER_ID, TEST_TOKEN } from "./helpers/ids.js";

const OkSchema = z.looseObject({ ok: z.literal(true) });

function setup(replies: readonly FakeReply[], extra: { baseUrl?: string } = {}) {
  const fake = fakeFetch(replies);
  const config = resolveConfig({
    phoneNumberId: TEST_PHONE_NUMBER_ID,
    accessToken: TEST_TOKEN,
    graphApiVersion: "v25.0",
    fetch: fake.fetch,
    ...extra,
  });
  return { fake, config };
}

async function catchError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the promise to reject");
}

describe("request URL, headers and fetch (tests 2-3)", () => {
  it("builds the Graph URL and sends Bearer auth and JSON content type", async () => {
    const { fake, config } = setup([jsonResponse({ ok: true })]);
    await request(
      config,
      { method: "POST", path: `${TEST_PHONE_NUMBER_ID}/messages`, json: { a: 1 } },
      OkSchema,
    );
    expect(fake.calls).toHaveLength(1);
    const call = fake.calls[0];
    expect(call?.url).toBe("https://graph.facebook.com/v25.0/100000000000001/messages");
    expect(call?.method).toBe("POST");
    expect(call?.headers.authorization).toBe("Bearer test-token");
    expect(call?.headers["content-type"]).toBe("application/json");
    expect(call?.body).toBe('{"a":1}');
  });

  it("honors baseUrl (with or without a trailing slash)", async () => {
    const { fake, config } = setup([jsonResponse({ ok: true })], {
      baseUrl: "https://graph.example.test/",
    });
    await request(
      config,
      { method: "POST", path: `${TEST_PHONE_NUMBER_ID}/media`, json: {} },
      OkSchema,
    );
    expect(fake.calls[0]?.url).toBe("https://graph.example.test/v25.0/100000000000001/media");
  });

  it("does not set Content-Type for FormData bodies", async () => {
    const { fake, config } = setup([jsonResponse({ ok: true })]);
    const form = new FormData();
    form.append("a", "b");
    await request(
      config,
      { method: "POST", path: `${TEST_PHONE_NUMBER_ID}/media`, form },
      OkSchema,
    );
    expect(fake.calls[0]?.headers["content-type"]).toBeUndefined();
    expect(fake.calls[0]?.body).toBe(form);
  });

  it("uses globalThis.fetch when no fetch is injected", async () => {
    const fake = fakeFetch([jsonResponse({ ok: true })]);
    const original = globalThis.fetch;
    globalThis.fetch = fake.fetch;
    try {
      const config = resolveConfig({
        phoneNumberId: TEST_PHONE_NUMBER_ID,
        accessToken: TEST_TOKEN,
        graphApiVersion: "v26.0",
      });
      await request(
        config,
        { method: "POST", path: `${TEST_PHONE_NUMBER_ID}/messages`, json: {} },
        OkSchema,
      );
    } finally {
      globalThis.fetch = original;
    }
    expect(fake.calls[0]?.url).toBe("https://graph.facebook.com/v26.0/100000000000001/messages");
  });
});

describe("abort signal (test 4)", () => {
  it("passes the signal to fetch", async () => {
    const { fake, config } = setup([jsonResponse({ ok: true })]);
    const controller = new AbortController();
    await request(
      config,
      { method: "POST", path: `${TEST_PHONE_NUMBER_ID}/messages`, json: {} },
      OkSchema,
      controller.signal,
    );
    expect(fake.calls[0]?.signal).toBe(controller.signal);
  });

  it("raises WaTransportError when aborted", async () => {
    const controller = new AbortController();
    const { config } = setup([
      (call) =>
        new Promise<Response>((_resolve, reject) => {
          call.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }),
    ]);
    const pending = request(
      config,
      { method: "POST", path: `${TEST_PHONE_NUMBER_ID}/messages`, json: {} },
      OkSchema,
      controller.signal,
    );
    controller.abort();
    const error = await catchError(pending);
    expect(error).toBeInstanceOf(WaTransportError);
  });
});

describe("error mapping (tests 18, 20)", () => {
  it("maps a Graph error envelope to WaApiError", async () => {
    const { config } = setup([
      jsonResponse(
        {
          error: {
            message: "(#131047) Re-engagement message",
            type: "OAuthException",
            code: 131047,
            error_data: { messaging_product: "whatsapp", details: "More than 24 hours" },
            fbtrace_id: "Afaketrace",
          },
        },
        400,
      ),
    ]);
    const error = await catchError(
      request(
        config,
        { method: "POST", path: `${TEST_PHONE_NUMBER_ID}/messages`, json: {} },
        OkSchema,
      ),
    );
    expect(error).toBeInstanceOf(WaApiError);
    const apiError = error as WaApiError;
    expect(apiError.httpStatus).toBe(400);
    expect(apiError.code).toBe(131047);
    expect(apiError.details).toBe("More than 24 hours");
    expect(apiError.fbtraceId).toBe("Afaketrace");
    expect(apiError.category).toBe("service_window_closed");
  });

  it.each([
    ["HTML", textResponse("<html>Bad gateway</html>", 502)],
    ["empty", new Response("", { status: 500 })],
    ["other JSON", jsonResponse({ oops: true }, 400)],
  ])("maps a non-envelope %s body to WaHttpError", async (_label, response) => {
    const { config } = setup([response]);
    const error = await catchError(
      request(
        config,
        { method: "POST", path: `${TEST_PHONE_NUMBER_ID}/messages`, json: {} },
        OkSchema,
      ),
    );
    expect(error).toBeInstanceOf(WaHttpError);
    expect((error as WaHttpError).httpStatus).toBe(response.status);
  });

  it("maps a fetch rejection to WaTransportError with the cause", async () => {
    const cause = new TypeError("fetch failed");
    const { config } = setup([cause]);
    const error = await catchError(
      request(
        config,
        { method: "POST", path: `${TEST_PHONE_NUMBER_ID}/messages`, json: {} },
        OkSchema,
      ),
    );
    expect(error).toBeInstanceOf(WaTransportError);
    expect((error as WaTransportError).cause).toBe(cause);
  });

  it("maps a 2xx body that fails the schema to WaResponseShapeError", async () => {
    const { config } = setup([jsonResponse({ ok: false })]);
    const error = await catchError(
      request(
        config,
        { method: "POST", path: `${TEST_PHONE_NUMBER_ID}/messages`, json: {} },
        OkSchema,
      ),
    );
    expect(error).toBeInstanceOf(WaResponseShapeError);
    expect((error as WaResponseShapeError).raw).toEqual({ ok: false });
    expect((error as WaResponseShapeError).issues.length).toBeGreaterThan(0);
  });

  it("maps a 2xx non-JSON body to WaResponseShapeError", async () => {
    const { config } = setup([textResponse("not json", 200)]);
    const error = await catchError(
      request(
        config,
        { method: "POST", path: `${TEST_PHONE_NUMBER_ID}/messages`, json: {} },
        OkSchema,
      ),
    );
    expect(error).toBeInstanceOf(WaResponseShapeError);
    expect((error as WaResponseShapeError).raw).toBe("not json");
  });
});

describe("token secrecy (test 5)", () => {
  const replies: readonly (readonly [string, () => FakeReply])[] = [
    ["api", () => jsonResponse({ error: { message: "(#190) bad token", code: 190 } }, 401)],
    ["http", () => textResponse("<html>error</html>", 500)],
    ["transport", () => new TypeError("fetch failed")],
    ["shape", () => jsonResponse({ nope: 1 })],
  ];

  it.each(replies)("keeps the token out of a %s error", async (_label, reply) => {
    const { config } = setup([reply()]);
    const error = await catchError(
      request(
        config,
        { method: "POST", path: `${TEST_PHONE_NUMBER_ID}/messages`, json: {} },
        OkSchema,
      ),
    );
    expect(error).toBeInstanceOf(Error);
    const e = error as Error;
    expect(e.message).not.toContain(TEST_TOKEN);
    expect(e.stack ?? "").not.toContain(TEST_TOKEN);
    expect(JSON.stringify(e)).not.toContain(TEST_TOKEN);
    expect(String(e)).not.toContain(TEST_TOKEN);
  });
});

describe("generalized request (v0.2)", () => {
  it("sends GET with a query string, no body and no Content-Type", async () => {
    const { fake, config } = setup([jsonResponse({ ok: true })]);
    await request(
      config,
      { method: "GET", path: "400000000000004", query: { phone_number_id: TEST_PHONE_NUMBER_ID } },
      OkSchema,
    );
    const call = fake.calls[0];
    expect(call?.method).toBe("GET");
    expect(call?.url).toBe(
      "https://graph.facebook.com/v25.0/400000000000004?phone_number_id=100000000000001",
    );
    expect(call?.body).toBeUndefined();
    expect(call?.headers["content-type"]).toBeUndefined();
    expect(call?.headers.authorization).toBe("Bearer test-token");
  });

  it("skips undefined query values and URL-encodes the rest", async () => {
    const { fake, config } = setup([jsonResponse({ ok: true })]);
    await request(
      config,
      { method: "DELETE", path: "x/message_templates", query: { a: "b c", skip: undefined, n: 5 } },
      OkSchema,
    );
    expect(fake.calls[0]?.method).toBe("DELETE");
    expect(fake.calls[0]?.url).toBe(
      "https://graph.facebook.com/v25.0/x/message_templates?a=b+c&n=5",
    );
  });

  it("omits the query string when every value is undefined", async () => {
    const { fake, config } = setup([jsonResponse({ ok: true })]);
    await request(config, { method: "GET", path: "x", query: { a: undefined } }, OkSchema);
    expect(fake.calls[0]?.url).toBe("https://graph.facebook.com/v25.0/x");
  });

  it('parse: "none" ignores the response body', async () => {
    const { config } = setup([textResponse("", 200)]);
    await expect(
      request(config, { method: "DELETE", path: "x", parse: "none" }, z.undefined()),
    ).resolves.toBeUndefined();
  });

  it('parse: "none" still maps non-2xx responses to errors', async () => {
    const { config } = setup([jsonResponse({ error: { message: "(#100) bad", code: 100 } }, 400)]);
    const error = await catchError(
      request(config, { method: "DELETE", path: "x", parse: "none" }, z.undefined()),
    );
    expect(error).toBeInstanceOf(WaApiError);
  });

  it("works with a config that has no phoneNumberId (WABA scope)", async () => {
    const fake = fakeFetch([jsonResponse({ ok: true })]);
    await request(
      {
        accessToken: TEST_TOKEN,
        graphApiVersion: "v25.0",
        baseUrl: "https://graph.facebook.com",
        fetch: fake.fetch,
      },
      { method: "GET", path: "200000000000002/message_templates" },
      OkSchema,
    );
    expect(fake.calls[0]?.url).toBe(
      "https://graph.facebook.com/v25.0/200000000000002/message_templates",
    );
  });
});
