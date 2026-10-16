import { describe, expect, it } from "vitest";
import { SendMessageResponseSchema, WaResponseShapeError } from "../../src/index.js";
import { jsonResponse } from "../helpers/fake-fetch.js";
import { testClient } from "../helpers/client.js";
import { TEST_RECIPIENT } from "../helpers/ids.js";
import { SEND_RESPONSE, SEND_RESPONSE_PACED } from "../fixtures/send-response.js";

const send = { to: TEST_RECIPIENT, body: "Hello" };

describe("send response (tests 16-17)", () => {
  it("parses the doc example into a result", async () => {
    const { client } = testClient([jsonResponse(SEND_RESPONSE)]);
    const result = await client.sendText(send);
    expect(result).toStrictEqual({
      messageId: "wamid.TEST000000000000000000000001",
      waId: "15550000001",
      raw: SEND_RESPONSE,
    });
  });

  it("exposes message_status when present (F-011)", async () => {
    const { client } = testClient([jsonResponse(SEND_RESPONSE_PACED)]);
    const result = await client.sendText(send);
    expect(result.messageStatus).toBe("accepted");
  });

  it("tolerates extra unknown fields", async () => {
    const extended = {
      ...SEND_RESPONSE,
      new_top_level: 1,
      contacts: [{ input: "+15550000001", wa_id: "15550000001", extra: true }],
      messages: [{ id: "wamid.TEST000000000000000000000001", future: "x" }],
    };
    expect(SendMessageResponseSchema.safeParse(extended).success).toBe(true);
    const { client } = testClient([jsonResponse(extended)]);
    await expect(client.sendText(send)).resolves.toMatchObject({
      messageId: "wamid.TEST000000000000000000000001",
    });
  });

  it.each([
    ["messages: []", { ...SEND_RESPONSE, messages: [] }],
    ["a missing id", { ...SEND_RESPONSE, messages: [{}] }],
    [
      "an unknown message_status",
      { ...SEND_RESPONSE, messages: [{ id: "x", message_status: "z" }] },
    ],
  ])("raises WaResponseShapeError for %s", async (_label, body) => {
    const { client } = testClient([jsonResponse(body)]);
    await expect(client.sendText(send)).rejects.toBeInstanceOf(WaResponseShapeError);
  });
});
