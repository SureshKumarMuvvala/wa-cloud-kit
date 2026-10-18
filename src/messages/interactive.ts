import { z } from "zod";
import {
  CommonSendFields,
  MediaRefSchema,
  PayloadEnvelopeShape,
  envelope,
  parseInput,
} from "./common.js";

/** Reply-button limits (F-231). */
export const REPLY_BUTTON_LIMITS = {
  buttons: 3,
  buttonId: 256,
  buttonTitle: 20,
  body: 1024,
  footer: 60,
} as const; // F-231

/** List limits (F-232). */
export const LIST_MESSAGE_LIMITS = {
  sections: 10,
  rowsTotal: 10,
  header: 60,
  body: 4096,
  footer: 60,
  buttonText: 20,
  sectionTitle: 24,
  rowId: 200,
  rowTitle: 24,
  rowDescription: 72,
} as const; // F-232

function noDuplicates(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

/**
 * Reply-buttons input (F-230, F-231). A service message: **only inside an open
 * customer service window** (F-233, F-031); outside it the send fails with
 * `131047` (F-033). A text header has no documented limit (G-24). Prefer media
 * `id` over `link`, which the page calls "not recommended" (F-231). Lengths
 * count UTF-16 code units [lib].
 */
export const SendReplyButtonsInputSchema = z
  .strictObject({
    ...CommonSendFields,
    header: z
      .discriminatedUnion("type", [
        z.strictObject({ type: z.literal("text"), text: z.string().min(1) }), // G-24
        z.strictObject({ type: z.literal("document"), document: MediaRefSchema }),
        z.strictObject({ type: z.literal("image"), image: MediaRefSchema }),
        z.strictObject({ type: z.literal("video"), video: MediaRefSchema }),
      ])
      .optional(), // F-231
    body: z.string().min(1).max(REPLY_BUTTON_LIMITS.body),
    footer: z.string().min(1).max(REPLY_BUTTON_LIMITS.footer).optional(),
    buttons: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(REPLY_BUTTON_LIMITS.buttonId),
          title: z.string().min(1).max(REPLY_BUTTON_LIMITS.buttonTitle),
        }),
      )
      .min(1)
      .max(REPLY_BUTTON_LIMITS.buttons),
  })
  .refine((input) => noDuplicates(input.buttons.map((b) => b.id)), {
    message: "Button ids must be unique", // F-231
    path: ["buttons"],
  })
  .refine((input) => noDuplicates(input.buttons.map((b) => b.title)), {
    message: "Button titles must be unique", // F-231
    path: ["buttons"],
  });
export type SendReplyButtonsInput = z.input<typeof SendReplyButtonsInputSchema>;

const MediaPayload = z.strictObject({ id: z.string().optional(), link: z.string().optional() });

/** The exact JSON body of a reply-buttons message (F-010, F-230, F-231). */
export const ReplyButtonsPayloadSchema = z.strictObject({
  ...PayloadEnvelopeShape,
  type: z.literal("interactive"),
  interactive: z.strictObject({
    type: z.literal("button"),
    header: z
      .strictObject({
        type: z.enum(["text", "document", "image", "video"]),
        text: z.string().optional(),
        document: MediaPayload.optional(),
        image: MediaPayload.optional(),
        video: MediaPayload.optional(),
      })
      .optional(),
    body: z.strictObject({ text: z.string() }),
    footer: z.strictObject({ text: z.string() }).optional(),
    action: z.strictObject({
      buttons: z.array(
        z.strictObject({
          type: z.literal("reply"),
          reply: z.strictObject({ id: z.string(), title: z.string() }),
        }),
      ),
    }),
  }),
});
export type ReplyButtonsPayload = z.output<typeof ReplyButtonsPayloadSchema>;

/** Builds the reply-buttons payload. Pure; throws `WaValidationError` on invalid input. */
export function buildReplyButtonsMessage(input: SendReplyButtonsInput): ReplyButtonsPayload {
  const parsed = parseInput(SendReplyButtonsInputSchema, input, "Invalid reply buttons message");
  return {
    ...envelope(parsed),
    type: "interactive",
    interactive: {
      type: "button",
      ...(parsed.header === undefined ? {} : { header: parsed.header }),
      body: { text: parsed.body },
      ...(parsed.footer === undefined ? {} : { footer: { text: parsed.footer } }),
      action: {
        buttons: parsed.buttons.map((button) => ({
          type: "reply" as const,
          reply: { id: button.id, title: button.title },
        })),
      },
    },
  };
}

/**
 * List input (F-230, F-232). A service message: **only inside an open customer
 * service window** (F-233, F-031). Section titles are always required (C-21,
 * D-41). At most 10 rows across all sections; row ids unique across the
 * message (F-232).
 */
export const SendListInputSchema = z
  .strictObject({
    ...CommonSendFields,
    header: z.string().min(1).max(LIST_MESSAGE_LIMITS.header).optional(), // text only (F-232)
    body: z.string().min(1).max(LIST_MESSAGE_LIMITS.body),
    footer: z.string().min(1).max(LIST_MESSAGE_LIMITS.footer).optional(),
    buttonText: z.string().min(1).max(LIST_MESSAGE_LIMITS.buttonText),
    sections: z
      .array(
        z.strictObject({
          title: z.string().min(1).max(LIST_MESSAGE_LIMITS.sectionTitle), // C-21, D-41
          rows: z
            .array(
              z.strictObject({
                id: z.string().min(1).max(LIST_MESSAGE_LIMITS.rowId),
                title: z.string().min(1).max(LIST_MESSAGE_LIMITS.rowTitle),
                description: z.string().min(1).max(LIST_MESSAGE_LIMITS.rowDescription).optional(),
              }),
            )
            .min(1),
        }),
      )
      .min(1)
      .max(LIST_MESSAGE_LIMITS.sections),
  })
  .refine(
    (input) =>
      input.sections.reduce((total, s) => total + s.rows.length, 0) <=
      LIST_MESSAGE_LIMITS.rowsTotal,
    { message: "At most 10 rows across all sections", path: ["sections"] }, // F-232
  )
  .refine((input) => noDuplicates(input.sections.flatMap((s) => s.rows.map((r) => r.id))), {
    message: "Row ids must be unique", // F-232
    path: ["sections"],
  });
export type SendListInput = z.input<typeof SendListInputSchema>;

/** The exact JSON body of a list message (F-010, F-230, F-232). */
export const ListMessagePayloadSchema = z.strictObject({
  ...PayloadEnvelopeShape,
  type: z.literal("interactive"),
  interactive: z.strictObject({
    type: z.literal("list"),
    header: z.strictObject({ type: z.literal("text"), text: z.string() }).optional(),
    body: z.strictObject({ text: z.string() }),
    footer: z.strictObject({ text: z.string() }).optional(),
    action: z.strictObject({
      button: z.string(),
      sections: z.array(
        z.strictObject({
          title: z.string(),
          rows: z.array(
            z.strictObject({
              id: z.string(),
              title: z.string(),
              description: z.string().optional(),
            }),
          ),
        }),
      ),
    }),
  }),
});
export type ListMessagePayload = z.output<typeof ListMessagePayloadSchema>;

/** Builds the list payload. Pure; throws `WaValidationError` on invalid input. */
export function buildListMessage(input: SendListInput): ListMessagePayload {
  const parsed = parseInput(SendListInputSchema, input, "Invalid list message");
  return {
    ...envelope(parsed),
    type: "interactive",
    interactive: {
      type: "list",
      ...(parsed.header === undefined ? {} : { header: { type: "text", text: parsed.header } }),
      body: { text: parsed.body },
      ...(parsed.footer === undefined ? {} : { footer: { text: parsed.footer } }),
      action: {
        button: parsed.buttonText,
        sections: parsed.sections.map((section) => ({
          title: section.title,
          rows: section.rows.map((row) => ({
            id: row.id,
            title: row.title,
            ...(row.description === undefined ? {} : { description: row.description }),
          })),
        })),
      },
    },
  };
}
