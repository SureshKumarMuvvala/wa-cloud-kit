import { z } from "zod";

/** `status` values of the REST reference (F-113). */
export const TEMPLATE_STATUSES = [
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
] as const; // F-113
export type WaKnownTemplateStatus = (typeof TEMPLATE_STATUSES)[number];

/** `rejected_reason` values (F-114). `CATEGORY_NOT_AVAILABLE` is deprecated. */
export const TEMPLATE_REJECTION_REASONS = [
  "ABUSIVE_CONTENT",
  "CATEGORY_NOT_AVAILABLE",
  "INCORRECT_CATEGORY",
  "INVALID_FORMAT",
  "NONE",
  "PROMOTIONAL",
  "SCAM",
  "TAG_CONTENT_MISMATCH",
] as const; // F-114
export type WaKnownTemplateRejectionReason = (typeof TEMPLATE_REJECTION_REASONS)[number];

/** `quality_score.score` values (F-115). */
export const TEMPLATE_QUALITY_SCORES = ["GREEN", "RED", "UNKNOWN", "YELLOW"] as const; // F-115
export type WaKnownTemplateQualityScore = (typeof TEMPLATE_QUALITY_SCORES)[number];

/** `category` values (F-103). */
export const TEMPLATE_CATEGORIES = [
  "AUTHENTICATION",
  "FREE_SERVICE",
  "MARKETING",
  "UTILITY",
] as const; // F-103
export type WaKnownTemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

/** Fields that `fields` accepts on list and get (F-112). */
export const TEMPLATE_FIELDS = [
  "id",
  "name",
  "language",
  "category",
  "components",
  "status",
  "rejected_reason",
  "quality_score",
  "parameter_format",
  "last_updated_time",
  "correct_category",
  "previous_category",
  "sub_category",
] as const; // F-112
export type WaTemplateField = (typeof TEMPLATE_FIELDS)[number];

/**
 * A message template as returned by list and get (F-110, F-112). Loose, and
 * `status`, `category` and `rejected_reason` are plain strings (D-9): Meta's
 * own lists differ between pages (F-113 vs F-117), so unknown values must
 * parse. Use the `isKnown…` guards to narrow.
 */
export const WaTemplateSchema = z.looseObject({
  id: z.string(),
  name: z.string().optional(),
  language: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  parameter_format: z.string().optional(),
  rejected_reason: z.string().optional(),
  quality_score: z
    .looseObject({
      score: z.string().optional(),
      reason: z.string().optional(),
      reasons: z.array(z.string()).optional(),
      date: z.number().optional(),
    })
    .optional(),
  components: z.array(z.looseObject({})).optional(),
  last_updated_time: z.number().optional(),
});
export type WaTemplate = z.output<typeof WaTemplateSchema>;

function includes<T extends string>(list: readonly T[], value: string): value is T {
  return (list as readonly string[]).includes(value);
}

/** Narrows a status string to a value listed in F-113. */
export function isKnownTemplateStatus(value: string): value is WaKnownTemplateStatus {
  return includes(TEMPLATE_STATUSES, value);
}

/** Narrows a `rejected_reason` string to a value listed in F-114. */
export function isKnownTemplateRejectionReason(
  value: string,
): value is WaKnownTemplateRejectionReason {
  return includes(TEMPLATE_REJECTION_REASONS, value);
}

/** Narrows a quality score string to a value listed in F-115. */
export function isKnownTemplateQualityScore(value: string): value is WaKnownTemplateQualityScore {
  return includes(TEMPLATE_QUALITY_SCORES, value);
}

/** Narrows a category string to a value listed in F-103. */
export function isKnownTemplateCategory(value: string): value is WaKnownTemplateCategory {
  return includes(TEMPLATE_CATEGORIES, value);
}
