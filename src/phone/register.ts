import { z } from "zod";

/** A 6-digit two-step verification PIN (F-157, F-208, F-212). A secret: never logged. */
export const PinSchema = z.string().regex(/^\d{6}$/, "PIN must be 6 digits");

/**
 * Register input (F-208). `data_localization_region` and `backup` are not
 * exposed (C-19; migration is a non-goal).
 */
export const RegisterPhoneNumberInputSchema = z.strictObject({ pin: PinSchema });
export type RegisterPhoneNumberInput = z.input<typeof RegisterPhoneNumberInputSchema>;

/** Two-step PIN input (F-212). */
export const SetTwoStepPinInputSchema = z.strictObject({ pin: PinSchema });
export type SetTwoStepPinInput = z.input<typeof SetTwoStepPinInputSchema>;

/** `{success}` for register and two-step (F-208, F-212). `success` is required [lib]. */
export const PhoneSuccessResponseSchema = z.looseObject({ success: z.boolean() });
export type PhoneSuccessResponse = z.output<typeof PhoneSuccessResponseSchema>;

export interface PhoneSuccessResult {
  success: boolean;
  raw: PhoneSuccessResponse;
}
