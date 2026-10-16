/** A recorded call made through {@link fakeFetch}. */
export interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  signal: AbortSignal | undefined;
  redirect: RequestRedirect | undefined;
}

/** One canned reply: a Response, a factory, or an error to throw. */
export type FakeReply = Response | ((call: RecordedCall) => Response | Promise<Response>) | Error;

export interface FakeFetch {
  fetch: typeof globalThis.fetch;
  calls: RecordedCall[];
}

/**
 * Fake `fetch` for tests. Records every call and returns the canned replies
 * in order. It never touches the network.
 */
export function fakeFetch(replies: readonly FakeReply[]): FakeFetch {
  const calls: RecordedCall[] = [];
  let index = 0;
  const fetchImpl = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, key) => {
      headers[key] = value;
    });
    const call: RecordedCall = {
      url,
      method: init?.method ?? "GET",
      headers,
      body: init?.body,
      signal: init?.signal ?? undefined,
      redirect: init?.redirect,
    };
    calls.push(call);
    const reply = replies[index];
    index += 1;
    if (reply === undefined) {
      throw new Error(`fakeFetch: no reply configured for call #${String(index)}`);
    }
    if (reply instanceof Error) {
      throw reply;
    }
    if (reply instanceof Response) {
      return reply;
    }
    return reply(call);
  };
  return { fetch: fetchImpl, calls };
}

/** A JSON `Response` with the given status. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** A plain-text `Response` with the given status. */
export function textResponse(body: string, status: number): Response {
  return new Response(body, { status, headers: { "content-type": "text/html" } });
}
