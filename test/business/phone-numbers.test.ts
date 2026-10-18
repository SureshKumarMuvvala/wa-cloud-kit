import { describe, expect, it } from "vitest";
import {
  WaValidationError,
  createWaBusinessClient,
  findPhoneNumber,
  type ListPhoneNumbersInput,
} from "../../src/index.js";
import { fakeFetch, jsonResponse, type FakeReply } from "../helpers/fake-fetch.js";
import { TEST_BUSINESS_TOKEN, TEST_PHONE_NUMBER_ID, TEST_WABA_ID } from "../helpers/ids.js";

function setup(replies: readonly FakeReply[]) {
  const fake = fakeFetch(replies);
  const client = createWaBusinessClient({
    wabaId: TEST_WABA_ID,
    accessToken: TEST_BUSINESS_TOKEN,
    graphApiVersion: "v25.0",
    fetch: fake.fetch,
  });
  return { fake, client };
}

const LIST = {
  data: [
    {
      id: TEST_PHONE_NUMBER_ID,
      display_phone_number: "+1 555 000 0000",
      verified_name: "Example Traders",
      code_verification_status: "VERIFIED",
      platform_type: "CLOUD_API",
    },
    { id: "100000000000009" },
  ],
  paging: { cursors: { before: "b1", after: "a1" }, next: "https://graph.example.test/next" },
};

describe("listPhoneNumbers (test 89, F-206, D-36)", () => {
  it("GETs the WABA's phone_numbers with the business token", async () => {
    const { fake, client } = setup([jsonResponse(LIST)]);
    const result = await client.listPhoneNumbers({
      fields: ["id", "status"],
      limit: 100,
      after: "a0",
    });
    const call = fake.calls[0];
    expect(call?.method).toBe("GET");
    expect(call?.url).toBe(
      `https://graph.facebook.com/v25.0/${TEST_WABA_ID}/phone_numbers?fields=id%2Cstatus&limit=100&after=a0`,
    );
    expect(call?.headers.authorization).toBe(`Bearer ${TEST_BUSINESS_TOKEN}`);
    expect(result.phoneNumbers).toHaveLength(2);
    expect(result.nextCursor).toBe("a1");
    expect(result.previousCursor).toBeUndefined();
    expect(fake.calls).toHaveLength(1); // paging.next is never fetched
  });

  it("parses an item with only an id (C-18) and sends no query without input", async () => {
    const { fake, client } = setup([jsonResponse({ data: [{ id: TEST_PHONE_NUMBER_ID }] })]);
    const result = await client.listPhoneNumbers();
    expect(fake.calls[0]?.url).toBe(
      `https://graph.facebook.com/v25.0/${TEST_WABA_ID}/phone_numbers`,
    );
    expect(result.phoneNumbers).toEqual([{ id: TEST_PHONE_NUMBER_ID }]);
    expect(result.nextCursor).toBeUndefined();
  });

  it.each<[string, ListPhoneNumbersInput]>([
    ["limit 0", { limit: 0 }],
    ["limit 101", { limit: 101 }],
    ["empty fields", { fields: [] }],
    ["bad field name", { fields: ["id,status"] }],
  ])("rejects %s with no request", async (_label, input) => {
    const { fake, client } = setup([]);
    await expect(client.listPhoneNumbers(input)).rejects.toThrow(WaValidationError);
    expect(fake.calls).toEqual([]);
  });

  it("accepts limit 1", async () => {
    const { client } = setup([jsonResponse({ data: [] })]);
    await expect(client.listPhoneNumbers({ limit: 1 })).resolves.toMatchObject({
      phoneNumbers: [],
    });
  });

  it("findPhoneNumber finds the event's number or returns undefined", async () => {
    const { client } = setup([jsonResponse(LIST)]);
    const result = await client.listPhoneNumbers();
    expect(findPhoneNumber(result, TEST_PHONE_NUMBER_ID)?.verified_name).toBe("Example Traders");
    expect(findPhoneNumber(result, "100000000000002")).toBeUndefined();
  });
});
