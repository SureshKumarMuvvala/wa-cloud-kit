import { z } from "zod";
import { TEMPLATE_FIELDS, WaTemplateSchema } from "./shapes.js";
import { TemplateNameSchema } from "./create.js";

const FieldsSchema = z.array(z.enum(TEMPLATE_FIELDS)).min(1); // F-112

/**
 * List input (F-110). An omitted `fields` returns Meta's default fields; an
 * empty array is rejected. `limit` has no known maximum (G-10).
 */
export const ListTemplatesInputSchema = z
  .strictObject({
    fields: FieldsSchema.optional(),
    limit: z.int().min(1).optional(),
    /** Cursor from a previous result's `nextCursor`. */
    after: z.string().min(1).optional(),
    before: z.string().min(1).optional(),
    /** Filter shown in the guide only, passed through unchecked (F-111, G-9). */
    status: z.string().min(1).optional(),
  })
  .optional();
export type ListTemplatesInput = z.input<typeof ListTemplatesInputSchema>;

/** List response (F-110). Loose. */
export const ListTemplatesResponseSchema = z.looseObject({
  data: z.array(WaTemplateSchema),
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
export type ListTemplatesResponse = z.output<typeof ListTemplatesResponseSchema>;

/**
 * `nextCursor` is `paging.cursors.after` when `paging.next` is present. The
 * library never follows the Meta-supplied `paging.next` URL: pass the cursor
 * back as `after` instead [lib].
 */
export interface ListTemplatesResult {
  templates: z.output<typeof WaTemplateSchema>[];
  nextCursor?: string;
  previousCursor?: string;
  raw: ListTemplatesResponse;
}

export function toListTemplatesResult(raw: ListTemplatesResponse): ListTemplatesResult {
  const { paging } = raw;
  const nextCursor = paging?.next === undefined ? undefined : paging.cursors?.after;
  const previousCursor = paging?.previous === undefined ? undefined : paging.cursors?.before;
  return {
    templates: raw.data,
    ...(nextCursor === undefined ? {} : { nextCursor }),
    ...(previousCursor === undefined ? {} : { previousCursor }),
    raw,
  };
}

/** Get-by-id input (F-112). The id becomes a path segment, so it is path-safe [lib]. */
export const GetTemplateInputSchema = z.strictObject({
  templateId: z.string().regex(/^[A-Za-z0-9_-]+$/),
  fields: FieldsSchema.optional(),
});
export type GetTemplateInput = z.input<typeof GetTemplateInputSchema>;

/**
 * Delete input (F-119). Exactly one of: a name (every language), a name plus
 * `templateId` (one language, sent as `hsm_id`), or up to 100 `templateIds`
 * (sent as `hsm_ids`, never together with `name`).
 *
 * Cautions from F-120: deleting by **name alone removes every language**;
 * deleting an approved template blocks that name for 30 days; `DISABLED`
 * templates cannot be deleted; the call needs `whatsapp_business_management`
 * (else error `200`); one invalid id in `templateIds` fails the whole request;
 * a template that was sent but not yet delivered goes to `PENDING_DELETION`.
 * An unknown name raises `WaApiError` (G-13).
 */
export const DeleteTemplateInputSchema = z.union([
  z.strictObject({ name: TemplateNameSchema }),
  z.strictObject({ name: TemplateNameSchema, templateId: z.string().min(1) }),
  z.strictObject({ templateIds: z.array(z.string().min(1)).min(1).max(100) }),
]);
export type DeleteTemplateInput = z.input<typeof DeleteTemplateInputSchema>;

/** Delete response (F-119). `success` is required [lib]. */
export const DeleteTemplateResponseSchema = z.looseObject({ success: z.boolean() });
export type DeleteTemplateResponse = z.output<typeof DeleteTemplateResponseSchema>;
export interface DeleteTemplateResult {
  success: boolean;
  raw: DeleteTemplateResponse;
}

/** Query for a delete call: `name`, `hsm_id`, or `hsm_ids=<JSON array>` (F-119). */
export function deleteTemplateQuery(
  input: z.output<typeof DeleteTemplateInputSchema>,
): Record<string, string> {
  if ("templateIds" in input) {
    return { hsm_ids: JSON.stringify(input.templateIds) };
  }
  return "templateId" in input
    ? { name: input.name, hsm_id: input.templateId }
    : { name: input.name };
}
