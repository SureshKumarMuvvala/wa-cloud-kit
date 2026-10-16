import { describe, expect, it } from "vitest";
import {
  WaApiError,
  WaError,
  WaHttpError,
  WaResponseShapeError,
  WaTransportError,
  WaValidationError,
  waErrorCategory,
  type WaErrorCategory,
} from "../src/index.js";

// Test 19: every row of the spec §5 table.
const TABLE: readonly (readonly [WaErrorCategory, readonly number[]])[] = [
  ["auth", [0, 3, 10, 190, 200, 201, 250, 299, 131005]],
  ["integrity", [368, 130497, 131031]],
  ["throttling", [4, 80007, 130429, 131048, 131056, 131064, 133016]],
  ["service_window_closed", [131047]],
  ["template", [132000, 132001, 132005, 132007, 132012, 132015, 132016]],
  ["recipient", [130403, 131021, 131026, 131049, 131050]],
  ["media", [131052, 131053]],
  ["parameter", [100, 131008, 131009, 131051]],
  ["server", [1, 2, 131000, 131016, 131057]],
];

describe("waErrorCategory", () => {
  for (const [category, codes] of TABLE) {
    it.each(codes)(`maps %i to "${category}"`, (code) => {
      expect(waErrorCategory(code)).toBe(category);
    });
  }

  it.each([999999, 199, 300, 5, 131060, -1])("maps %i to unknown", (code) => {
    expect(waErrorCategory(code)).toBe("unknown");
  });
});

describe("error classes", () => {
  it("all extend WaError and Error with a name discriminant", () => {
    const errors = [
      new WaValidationError("bad", []),
      new WaTransportError("down", { cause: new Error("x") }),
      new WaApiError({
        httpStatus: 400,
        envelope: { error: { message: "(#100) Invalid parameter", code: 100 } },
      }),
      new WaHttpError({ httpStatus: 502, bodyText: "<html>" }),
      new WaResponseShapeError({ issues: [], raw: {} }),
    ];
    expect(errors.map((e) => e.name)).toEqual([
      "WaValidationError",
      "WaTransportError",
      "WaApiError",
      "WaHttpError",
      "WaResponseShapeError",
    ]);
    for (const error of errors) {
      expect(error).toBeInstanceOf(WaError);
      expect(error).toBeInstanceOf(Error);
    }
  });

  it("WaApiError exposes the envelope fields and the category", () => {
    const error = new WaApiError({
      httpStatus: 400,
      envelope: {
        error: {
          message: "(#131047) Re-engagement message",
          type: "OAuthException",
          code: 131047,
          error_data: { messaging_product: "whatsapp", details: "More than 24 hours have passed" },
          error_subcode: 2494010,
          fbtrace_id: "Afake",
        },
      },
    });
    expect(error.message).toBe("(#131047) Re-engagement message");
    expect(error.httpStatus).toBe(400);
    expect(error.code).toBe(131047);
    expect(error.type).toBe("OAuthException");
    expect(error.details).toBe("More than 24 hours have passed");
    expect(error.errorSubcode).toBe(2494010);
    expect(error.fbtraceId).toBe("Afake");
    expect(error.category).toBe("service_window_closed");
  });

  it("WaHttpError truncates bodyText to 2 KB", () => {
    const error = new WaHttpError({ httpStatus: 500, bodyText: "x".repeat(5000) });
    expect(error.bodyText).toHaveLength(2048);
  });
});
