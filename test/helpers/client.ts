import { createWaClient, type WaClient } from "../../src/index.js";
import { fakeFetch, jsonResponse, type FakeFetch, type FakeReply } from "./fake-fetch.js";
import { SEND_RESPONSE } from "../fixtures/send-response.js";
import { TEST_PHONE_NUMBER_ID, TEST_TOKEN } from "./ids.js";

/** A client wired to a fake fetch that answers with `replies` (default: one send success). */
export function testClient(replies: readonly FakeReply[] = [jsonResponse(SEND_RESPONSE)]): {
  client: WaClient;
  fake: FakeFetch;
} {
  const fake = fakeFetch(replies);
  const client = createWaClient({
    phoneNumberId: TEST_PHONE_NUMBER_ID,
    accessToken: TEST_TOKEN,
    graphApiVersion: "v25.0",
    fetch: fake.fetch,
  });
  return { client, fake };
}

/** The JSON body of the n-th recorded call. */
export function sentJson(fake: FakeFetch, n = 0): unknown {
  const body = fake.calls[n]?.body;
  if (typeof body !== "string") {
    throw new Error("expected a JSON string body");
  }
  return JSON.parse(body) as unknown;
}
