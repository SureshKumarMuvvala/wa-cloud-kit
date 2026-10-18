import { describe, expect, it } from "vitest";
import {
  EMBEDDED_SIGNUP_CANCEL_STEPS,
  WaValidationError,
  parseEmbeddedSignupEvent,
} from "../../src/index.js";
import { TEST_BUSINESS_ID, TEST_PHONE_NUMBER_ID, TEST_WABA_ID } from "../helpers/ids.js";

describe("parseEmbeddedSignupEvent (test 86, F-200, F-201, D-39)", () => {
  it("parses a FINISH event with a phone number", () => {
    const input = {
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH",
      data: {
        phone_number_id: TEST_PHONE_NUMBER_ID,
        waba_id: TEST_WABA_ID,
        business_id: TEST_BUSINESS_ID,
      },
    };
    expect(parseEmbeddedSignupEvent(input)).toEqual({
      kind: "finish",
      event: "FINISH",
      wabaId: TEST_WABA_ID,
      phoneNumberId: TEST_PHONE_NUMBER_ID,
      businessId: TEST_BUSINESS_ID,
      raw: input,
    });
  });

  it("parses FINISH_ONLY_WABA without a phone number", () => {
    const parsed = parseEmbeddedSignupEvent({
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH_ONLY_WABA",
      data: { waba_id: TEST_WABA_ID },
    });
    expect(parsed).toMatchObject({
      kind: "finish",
      event: "FINISH_ONLY_WABA",
      wabaId: TEST_WABA_ID,
    });
    expect(parsed).not.toHaveProperty("phoneNumberId");
  });

  it("parses a multi-WABA flow and keeps extra fields in raw", () => {
    const input = {
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH",
      version: 4,
      data: { waba_id: TEST_WABA_ID, waba_ids: [TEST_WABA_ID, "200000000000003"], page_ids: ["1"] },
    };
    const parsed = parseEmbeddedSignupEvent(input);
    expect(parsed).toMatchObject({ kind: "finish", wabaIds: [TEST_WABA_ID, "200000000000003"] });
    expect(parsed.raw).toEqual(input);
  });

  it.each(EMBEDDED_SIGNUP_CANCEL_STEPS)("parses a cancel at %s", (step) => {
    expect(
      parseEmbeddedSignupEvent({
        type: "WA_EMBEDDED_SIGNUP",
        event: "CANCEL",
        data: { current_step: step },
        version: 3,
      }),
    ).toMatchObject({ kind: "cancel", currentStep: step });
  });

  it("parses a user-reported error", () => {
    expect(
      parseEmbeddedSignupEvent({
        type: "WA_EMBEDDED_SIGNUP",
        event: "CANCEL",
        data: {
          error_message: "Something went wrong",
          error_code: "524126",
          session_id: "test-session",
          timestamp: "1790000500",
        },
      }),
    ).toMatchObject({
      kind: "error_report",
      errorMessage: "Something went wrong",
      errorCode: "524126",
      sessionId: "test-session",
      timestamp: "1790000500",
    });
  });

  it("parses an ERROR event", () => {
    expect(parseEmbeddedSignupEvent({ type: "WA_EMBEDDED_SIGNUP", event: "ERROR" })).toMatchObject({
      kind: "flow_error",
    });
  });

  it.each([
    ["wrong type", { type: "OTHER", event: "FINISH", data: { waba_id: TEST_WABA_ID } }],
    [
      "non-digit waba id",
      { type: "WA_EMBEDDED_SIGNUP", event: "FINISH", data: { waba_id: "../x" } },
    ],
    [
      "non-digit phone id",
      {
        type: "WA_EMBEDDED_SIGNUP",
        event: "FINISH",
        data: { waba_id: TEST_WABA_ID, phone_number_id: "1?x" },
      },
    ],
    ["finish without waba id", { type: "WA_EMBEDDED_SIGNUP", event: "FINISH", data: {} }],
    ["cancel without step", { type: "WA_EMBEDDED_SIGNUP", event: "CANCEL", data: {} }],
    ["not an object", "FINISH"],
  ])("rejects %s with WaValidationError", (_label, input) => {
    expect(() => parseEmbeddedSignupEvent(input)).toThrow(WaValidationError);
  });
});
