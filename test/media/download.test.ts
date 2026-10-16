import { describe, expect, it } from "vitest";
import {
  DEFAULT_MEDIA_HOSTS,
  WaApiError,
  WaHttpError,
  WaTransportError,
  WaValidationError,
} from "../../src/index.js";
import { jsonResponse, textResponse } from "../helpers/fake-fetch.js";
import { catchError } from "../helpers/business-client.js";
import { testClient } from "../helpers/client.js";

const URL_OK = "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1&ext=2&hash=h";

function redirect(location: string, status = 302): Response {
  return new Response(null, { status, headers: { location } });
}

function chunkedBody(chunks: Uint8Array[], onCancel?: () => void): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[i];
      i += 1;
      if (chunk === undefined) {
        controller.close();
      } else {
        controller.enqueue(chunk);
      }
    },
    cancel() {
      onCancel?.();
    },
  });
}

describe("downloadMedia (test 56)", () => {
  it("sends the Bearer token to an allowed https host and returns a typed Blob", async () => {
    const { client, fake } = testClient([
      new Response("hello", { status: 200, headers: { "content-type": "image/png" } }),
    ]);
    const result = await client.downloadMedia({ url: URL_OK });
    expect(fake.calls).toHaveLength(1);
    expect(fake.calls[0]?.url).toBe(URL_OK);
    expect(fake.calls[0]?.method).toBe("GET");
    expect(fake.calls[0]?.headers.authorization).toBe("Bearer test-token");
    expect(result.contentType).toBe("image/png");
    expect(result.size).toBe(5);
    expect(result.body.type).toBe("image/png");
    expect(await result.body.text()).toBe("hello");
  });

  it("reports a null contentType when the header is absent", async () => {
    const { client } = testClient([new Response(new Uint8Array(1), { status: 200 })]);
    const result = await client.downloadMedia({ url: URL_OK });
    expect(result.contentType).toBeNull();
    expect(result.size).toBe(1);
  });

  it("exports the default host list (F-133, G-16)", () => {
    expect(DEFAULT_MEDIA_HOSTS).toEqual(["lookaside.fbsbx.com"]);
  });
});

describe("downloadMedia token safety (test 57)", () => {
  it.each([
    ["http scheme", "http://lookaside.fbsbx.com/x"],
    ["host not on the list", "https://example.test/x"],
    ["suffix look-alike", "https://lookaside.fbsbx.com.evil.test/x"],
    ["prefix look-alike", "https://evil-lookaside.fbsbx.com/x"],
    ["subdomain", "https://sub.lookaside.fbsbx.com/x"],
    ["credentials", "https://user:pass@lookaside.fbsbx.com/x"],
    ["username only", "https://user@lookaside.fbsbx.com/x"],
    ["port 8443", "https://lookaside.fbsbx.com:8443/x"],
    ["not a URL", "lookaside.fbsbx.com/x"],
  ])("rejects %s and makes zero requests", async (_label, url) => {
    const { client, fake } = testClient([new Response("secret", { status: 200 })]);
    const error = await catchError(client.downloadMedia({ url }));
    expect(error).toBeInstanceOf(WaValidationError);
    expect(fake.calls).toHaveLength(0);
  });

  it("accepts the explicit default port 443", async () => {
    const { client, fake } = testClient([new Response("ok", { status: 200 })]);
    await client.downloadMedia({ url: "https://lookaside.fbsbx.com:443/x" });
    expect(fake.calls).toHaveLength(1);
  });

  it("matches the hostname case-insensitively", async () => {
    const { client, fake } = testClient([new Response("ok", { status: 200 })]);
    await client.downloadMedia({ url: "https://LOOKASIDE.fbsbx.com/x" });
    expect(fake.calls).toHaveLength(1);
  });

  it("names only the hostname in the error, never the query or token", async () => {
    const { client } = testClient([]);
    const error = await catchError(
      client.downloadMedia({ url: "https://evil.test/path?token=SECRET&mid=1" }),
    );
    const message = (error as Error).message;
    expect(message).toContain("evil.test");
    expect(message).not.toContain("SECRET");
    expect(message).not.toContain("mid=1");
    expect(message).not.toContain("test-token");
  });
});

describe("downloadMedia redirects (test 58)", () => {
  it("follows a redirect to an allowed host once, with the token", async () => {
    const next = "https://lookaside.fbsbx.com/final?x=1";
    const { client, fake } = testClient([
      redirect(next),
      new Response("data", { status: 200, headers: { "content-type": "application/pdf" } }),
    ]);
    const result = await client.downloadMedia({ url: URL_OK });
    expect(fake.calls.map((c) => c.url)).toEqual([URL_OK, next]);
    expect(fake.calls.every((c) => c.headers.authorization === "Bearer test-token")).toBe(true);
    expect(await result.body.text()).toBe("data");
  });

  it("always asks fetch for redirect: manual", async () => {
    const { client, fake } = testClient([new Response("x", { status: 200 })]);
    await client.downloadMedia({ url: URL_OK });
    expect(fake.calls[0]?.redirect).toBe("manual");
  });

  it("refuses a redirect to another host and never sends the token to it", async () => {
    const { client, fake } = testClient([
      redirect("https://evil.test/steal"),
      new Response("never", { status: 200 }),
    ]);
    const error = await catchError(client.downloadMedia({ url: URL_OK }));
    expect(error).toBeInstanceOf(WaValidationError);
    expect(fake.calls).toHaveLength(1);
    expect(fake.calls.map((c) => c.url)).not.toContain("https://evil.test/steal");
  });

  it("refuses a redirect to http and to a credentialed URL", async () => {
    for (const location of [
      "http://lookaside.fbsbx.com/x",
      "https://u:p@lookaside.fbsbx.com/x",
      "https://lookaside.fbsbx.com:8443/x",
    ]) {
      const { client, fake } = testClient([redirect(location)]);
      expect(await catchError(client.downloadMedia({ url: URL_OK }))).toBeInstanceOf(
        WaValidationError,
      );
      expect(fake.calls).toHaveLength(1);
    }
  });

  it("resolves a relative Location against the current URL and checks it", async () => {
    const { client, fake } = testClient([
      redirect("/other?y=2"),
      new Response("ok", { status: 200 }),
    ]);
    await client.downloadMedia({ url: URL_OK });
    expect(fake.calls[1]?.url).toBe("https://lookaside.fbsbx.com/other?y=2");
  });

  it("allows three hops and throws on the fourth", async () => {
    const hop = (n: number) => redirect(`https://lookaside.fbsbx.com/h${String(n)}`);
    const ok = testClient([hop(1), hop(2), hop(3), new Response("end", { status: 200 })]);
    expect(await (await ok.client.downloadMedia({ url: URL_OK })).body.text()).toBe("end");

    const tooMany = testClient([
      hop(1),
      hop(2),
      hop(3),
      hop(4),
      new Response("x", { status: 200 }),
    ]);
    expect(await catchError(tooMany.client.downloadMedia({ url: URL_OK }))).toBeInstanceOf(
      WaValidationError,
    );
    expect(tooMany.fake.calls).toHaveLength(4);
  });

  it("treats a 3xx without Location as an HTTP error", async () => {
    const { client } = testClient([new Response(null, { status: 302 })]);
    expect(await catchError(client.downloadMedia({ url: URL_OK }))).toBeInstanceOf(WaHttpError);
  });
});

describe("downloadMedia allowedMediaHosts (test 59)", () => {
  it("replaces the default list", async () => {
    const other = "https://media.example.test/file";
    const { client, fake } = testClient([new Response("x", { status: 200 })]);
    await client.downloadMedia({ url: other, allowedMediaHosts: ["media.example.test"] });
    expect(fake.calls).toHaveLength(1);

    const second = testClient([new Response("x", { status: 200 })]);
    expect(
      await catchError(
        second.client.downloadMedia({ url: URL_OK, allowedMediaHosts: ["media.example.test"] }),
      ),
    ).toBeInstanceOf(WaValidationError);
    expect(second.fake.calls).toHaveLength(0);
  });

  it.each([
    ["scheme", "https://media.example.test"],
    ["wildcard", "*.example.test"],
    ["port", "media.example.test:443"],
    ["uppercase", "Media.Example.Test"],
    ["path", "media.example.test/x"],
    ["empty entry", ""],
  ])("rejects an entry with %s", async (_label, entry) => {
    const { client, fake } = testClient([new Response("x", { status: 200 })]);
    expect(
      await catchError(client.downloadMedia({ url: URL_OK, allowedMediaHosts: [entry] })),
    ).toBeInstanceOf(WaValidationError);
    expect(fake.calls).toHaveLength(0);
  });

  it("rejects an empty list", async () => {
    const { client } = testClient([]);
    expect(
      await catchError(client.downloadMedia({ url: URL_OK, allowedMediaHosts: [] })),
    ).toBeInstanceOf(WaValidationError);
  });
});

describe("downloadMedia maxBytes (test 60)", () => {
  it("aborts on a Content-Length over the limit and cancels the stream", async () => {
    let cancelled = false;
    const { client } = testClient([
      new Response(
        chunkedBody([new Uint8Array(10)], () => (cancelled = true)),
        {
          status: 200,
          headers: { "content-length": "10" },
        },
      ),
    ]);
    const error = await catchError(client.downloadMedia({ url: URL_OK, maxBytes: 5 }));
    expect(error).toBeInstanceOf(WaValidationError);
    expect((error as WaValidationError).issues[0]?.message).toContain("media larger than maxBytes");
    expect(cancelled).toBe(true);
  });

  it("aborts a stream that exceeds the limit without a header and cancels it", async () => {
    let cancelled = false;
    const chunks = [new Uint8Array(4), new Uint8Array(4), new Uint8Array(4)];
    const { client } = testClient([
      new Response(
        chunkedBody(chunks, () => (cancelled = true)),
        { status: 200 },
      ),
    ]);
    const error = await catchError(client.downloadMedia({ url: URL_OK, maxBytes: 6 }));
    expect(error).toBeInstanceOf(WaValidationError);
    expect((error as WaValidationError).issues[0]?.message).toContain("media larger than maxBytes");
    expect(cancelled).toBe(true);
  });

  it("accepts a body of exactly maxBytes", async () => {
    const { client } = testClient([new Response(new Uint8Array(6), { status: 200 })]);
    expect((await client.downloadMedia({ url: URL_OK, maxBytes: 6 })).size).toBe(6);
  });

  it("rejects a non-positive maxBytes", async () => {
    const { client, fake } = testClient([]);
    expect(await catchError(client.downloadMedia({ url: URL_OK, maxBytes: 0 }))).toBeInstanceOf(
      WaValidationError,
    );
    expect(fake.calls).toHaveLength(0);
  });

  it("defaults to 100,000,000 bytes (F-063, G-8)", async () => {
    const { client } = testClient([
      new Response("x", { status: 200, headers: { "content-length": "100000001" } }),
    ]);
    expect(await catchError(client.downloadMedia({ url: URL_OK }))).toBeInstanceOf(
      WaValidationError,
    );
  });
});

describe("downloadMedia errors (test 61)", () => {
  it("maps a Graph envelope 404 to WaApiError", async () => {
    const { client } = testClient([
      jsonResponse({ error: { message: "(#100) Not found", code: 100 } }, 404),
    ]);
    const error = await catchError(client.downloadMedia({ url: URL_OK }));
    expect(error).toBeInstanceOf(WaApiError);
    expect((error as WaApiError).httpStatus).toBe(404);
  });

  it("maps an HTML 404 to WaHttpError without token or query in the message", async () => {
    const { client } = testClient([textResponse("<html>not found</html>", 404)]);
    const error = await catchError(client.downloadMedia({ url: URL_OK }));
    expect(error).toBeInstanceOf(WaHttpError);
    const message = (error as Error).message;
    expect(message).not.toContain("test-token");
    expect(message).not.toContain("hash=h");
    expect((error as WaHttpError).httpStatus).toBe(404);
  });

  it("maps a fetch failure to WaTransportError", async () => {
    const { client } = testClient([new Error("boom")]);
    expect(await catchError(client.downloadMedia({ url: URL_OK }))).toBeInstanceOf(
      WaTransportError,
    );
  });

  it("passes the AbortSignal through", async () => {
    const { client, fake } = testClient([new Response("x", { status: 200 })]);
    const controller = new AbortController();
    await client.downloadMedia({ url: URL_OK }, { signal: controller.signal });
    expect(fake.calls[0]?.signal).toBe(controller.signal);
  });
});
