import { describe, expect, it } from "vitest";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_QUALITY_SCORES,
  TEMPLATE_REJECTION_REASONS,
  TEMPLATE_STATUSES,
  WaTemplateSchema,
  isKnownTemplateCategory,
  isKnownTemplateQualityScore,
  isKnownTemplateRejectionReason,
  isKnownTemplateStatus,
  type WaKnownTemplateStatus,
} from "../../src/index.js";

describe("template shapes (test 53)", () => {
  it("lists the documented values (F-113, F-114, F-115, F-103)", () => {
    expect(TEMPLATE_STATUSES).toEqual([
      "APPROVED",
      "ARCHIVED",
      "DELETED",
      "DISABLED",
      "IN_APPEAL",
      "LIMIT_EXCEEDED",
      "PAUSED",
      "PENDING",
      "PENDING_DELETION",
      "REJECTED",
    ]);
    expect(TEMPLATE_REJECTION_REASONS).toEqual([
      "ABUSIVE_CONTENT",
      "CATEGORY_NOT_AVAILABLE",
      "INCORRECT_CATEGORY",
      "INVALID_FORMAT",
      "NONE",
      "PROMOTIONAL",
      "SCAM",
      "TAG_CONTENT_MISMATCH",
    ]);
    expect(TEMPLATE_QUALITY_SCORES).toEqual(["GREEN", "RED", "UNKNOWN", "YELLOW"]);
    expect(TEMPLATE_CATEGORIES).toEqual(["AUTHENTICATION", "FREE_SERVICE", "MARKETING", "UTILITY"]);
  });

  it("parses unknown status, reason, category and score strings", () => {
    const parsed = WaTemplateSchema.parse({
      id: "1",
      status: "BRAND_NEW_STATUS",
      category: "BRAND_NEW_CATEGORY",
      rejected_reason: "BRAND_NEW_REASON",
      quality_score: { score: "PURPLE", reasons: ["x"], date: 1 },
      new_field: 1,
    });
    expect(parsed.status).toBe("BRAND_NEW_STATUS");
    expect(parsed.quality_score?.score).toBe("PURPLE");
    expect(parsed.new_field).toBe(1);
  });

  it("type guards narrow known values and reject unknown ones", () => {
    const narrow = (value: string): WaKnownTemplateStatus | undefined =>
      isKnownTemplateStatus(value) ? value : undefined;
    expect(narrow("APPROVED")).toBe("APPROVED");
    expect(narrow("anything")).toBeUndefined();
    expect(isKnownTemplateStatus("APPROVED")).toBe(true);
    expect(isKnownTemplateStatus("FLAGGED")).toBe(false); // webhook-only value (F-117)
    expect(isKnownTemplateRejectionReason("INVALID_FORMAT")).toBe(true);
    expect(isKnownTemplateRejectionReason("nope")).toBe(false);
    expect(isKnownTemplateQualityScore("GREEN")).toBe(true);
    expect(isKnownTemplateQualityScore("green")).toBe(false);
    expect(isKnownTemplateCategory("UTILITY")).toBe(true);
    expect(isKnownTemplateCategory("utility")).toBe(false);
  });
});
