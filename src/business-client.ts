import type { RequestOptions } from "./client.js";
import { resolveBusinessConfig, type WaBusinessConfig } from "./config.js";
import { parseInput } from "./messages/common.js";
import {
  CreateTemplateInputSchema,
  CreateTemplateResponseSchema,
  buildCreateTemplateBody,
  type CreateTemplateInput,
  type CreateTemplateResult,
} from "./templates/create.js";
import {
  DeleteTemplateInputSchema,
  DeleteTemplateResponseSchema,
  GetTemplateInputSchema,
  ListTemplatesInputSchema,
  ListTemplatesResponseSchema,
  deleteTemplateQuery,
  toListTemplatesResult,
  type DeleteTemplateInput,
  type DeleteTemplateResult,
  type GetTemplateInput,
  type ListTemplatesInput,
  type ListTemplatesResult,
} from "./templates/manage.js";
import { WaTemplateSchema, type WaTemplate } from "./templates/shapes.js";
import { request } from "./transport.js";

/**
 * A WABA-scoped client for template management (v0.2 §2). It holds no cache
 * and no mutable state [lib]; create one per request or per tenant. Every call
 * needs the `whatsapp_business_management` permission (F-120, F-154).
 */
export interface WaBusinessClient {
  /**
   * Creates a UTILITY template (F-100). The result is `PENDING` until review
   * finishes (F-106, F-116). Check the returned `category`: marketing content
   * is re-categorized (F-050, F-109). The 100-per-hour limit (F-105) and the
   * template cap (F-124) are not enforced here.
   */
  createTemplate(input: CreateTemplateInput, opts?: RequestOptions): Promise<CreateTemplateResult>;
  /** Lists templates (F-110). Pass `nextCursor` back as `after` to page. */
  listTemplates(input?: ListTemplatesInput, opts?: RequestOptions): Promise<ListTemplatesResult>;
  /** Gets one template; `fields: ["status"]` is a status-only check (F-112). */
  getTemplate(input: GetTemplateInput, opts?: RequestOptions): Promise<WaTemplate>;
  /** Deletes templates (F-119). See {@link DeleteTemplateInput} for the cautions (F-120). */
  deleteTemplate(input: DeleteTemplateInput, opts?: RequestOptions): Promise<DeleteTemplateResult>;
}

/**
 * Validates `config` once (throws `WaValidationError`) and returns a client.
 * Every method validates its input before any network call.
 */
export function createWaBusinessClient(config: WaBusinessConfig): WaBusinessClient {
  const resolved = resolveBusinessConfig(config);
  const templatesPath = `${resolved.wabaId}/message_templates`; // F-100

  return {
    // `async` turns a synchronous validation throw into a rejection.
    createTemplate: async (input, opts) => {
      const parsed = parseInput(CreateTemplateInputSchema, input, "Invalid template");
      const response = await request(
        resolved,
        { method: "POST", path: templatesPath, json: buildCreateTemplateBody(parsed) },
        CreateTemplateResponseSchema,
        opts?.signal,
      );
      return {
        templateId: response.id,
        status: response.status,
        category: response.category,
        raw: response,
      };
    },
    listTemplates: async (input, opts) => {
      const parsed = parseInput(ListTemplatesInputSchema, input, "Invalid template list request");
      const response = await request(
        resolved,
        {
          method: "GET",
          path: templatesPath,
          query: {
            fields: parsed?.fields?.join(","),
            limit: parsed?.limit,
            after: parsed?.after,
            before: parsed?.before,
            status: parsed?.status,
          },
        },
        ListTemplatesResponseSchema,
        opts?.signal,
      );
      return toListTemplatesResult(response);
    },
    getTemplate: async (input, opts) => {
      const parsed = parseInput(GetTemplateInputSchema, input, "Invalid template request");
      return request(
        resolved,
        { method: "GET", path: parsed.templateId, query: { fields: parsed.fields?.join(",") } },
        WaTemplateSchema,
        opts?.signal,
      );
    },
    deleteTemplate: async (input, opts) => {
      const parsed = parseInput(DeleteTemplateInputSchema, input, "Invalid template delete");
      const response = await request(
        resolved,
        { method: "DELETE", path: templatesPath, query: deleteTemplateQuery(parsed) },
        DeleteTemplateResponseSchema,
        opts?.signal,
      );
      return { success: response.success, raw: response };
    },
  };
}
