import { z } from "zod";

/** List input (F-206). An empty `fields` array is rejected; `limit` is 1–100. */
export const ListPhoneNumbersInputSchema = z
  .strictObject({
    fields: z
      .array(z.string().regex(/^[a-z_]+$/))
      .min(1)
      .optional(), // [lib] field names; joined with ","
    limit: z.int().min(1).max(100).optional(), // F-206
    after: z.string().min(1).optional(),
    before: z.string().min(1).optional(),
  })
  .optional();
export type ListPhoneNumbersInput = z.input<typeof ListPhoneNumbersInputSchema>;

/**
 * A phone number on the WABA (F-206). Only `id` is required: the reference
 * marks `status` required but the partner guide's example omits it (C-18).
 * Status values are strings, not enums (D-9).
 */
export const WaPhoneNumberSchema = z.looseObject({
  id: z.string(),
  display_phone_number: z.string().optional(),
  verified_name: z.string().optional(),
  status: z.string().optional(), // CONNECTED, PENDING, … (F-206)
  code_verification_status: z.string().optional(), // EXPIRED | NOT_VERIFIED | VERIFIED (F-206)
  platform_type: z.string().optional(), // CLOUD_API in the guide example (F-206)
});
export type WaPhoneNumber = z.output<typeof WaPhoneNumberSchema>;

export const ListPhoneNumbersResponseSchema = z.looseObject({
  data: z.array(WaPhoneNumberSchema),
  paging: z
    .looseObject({
      cursors: z
        .looseObject({ before: z.string().optional(), after: z.string().optional() })
        .optional(),
      next: z.string().optional(),
      previous: z.string().optional(),
    })
    .optional(),
});
export type ListPhoneNumbersResponse = z.output<typeof ListPhoneNumbersResponseSchema>;

/** `nextCursor` only when `paging.next` exists; `paging.next` is never fetched [lib]. */
export interface ListPhoneNumbersResult {
  phoneNumbers: WaPhoneNumber[];
  nextCursor?: string;
  previousCursor?: string;
  raw: ListPhoneNumbersResponse;
}

export function toListPhoneNumbersResult(raw: ListPhoneNumbersResponse): ListPhoneNumbersResult {
  const { paging } = raw;
  const nextCursor = paging?.next === undefined ? undefined : paging.cursors?.after;
  const previousCursor = paging?.previous === undefined ? undefined : paging.cursors?.before;
  return {
    phoneNumbers: raw.data,
    ...(nextCursor === undefined ? {} : { nextCursor }),
    ...(previousCursor === undefined ? {} : { previousCursor }),
    raw,
  };
}

/**
 * Finds the phone number from the browser-sent event in a list result (D-36).
 * `undefined` means the number is not on this WABA: stop onboarding.
 */
export function findPhoneNumber(
  result: Pick<ListPhoneNumbersResult, "phoneNumbers">,
  phoneNumberId: string,
): WaPhoneNumber | undefined {
  return result.phoneNumbers.find((number) => number.id === phoneNumberId);
}
