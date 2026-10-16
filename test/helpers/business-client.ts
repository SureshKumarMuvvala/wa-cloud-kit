import { createWaBusinessClient, type WaBusinessClient } from "../../src/index.js";
import { fakeFetch, type FakeFetch, type FakeReply } from "./fake-fetch.js";
import { TEST_TOKEN, TEST_WABA_ID } from "./ids.js";

/** A WABA-scoped client wired to a fake fetch that answers with `replies`. */
export function testBusinessClient(replies: readonly FakeReply[] = []): {
  client: WaBusinessClient;
  fake: FakeFetch;
} {
  const fake = fakeFetch(replies);
  const client = createWaBusinessClient({
    wabaId: TEST_WABA_ID,
    accessToken: TEST_TOKEN,
    graphApiVersion: "v25.0",
    fetch: fake.fetch,
  });
  return { client, fake };
}

/** Awaits a promise that must reject and returns the rejection. */
export async function catchError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the promise to reject");
}
