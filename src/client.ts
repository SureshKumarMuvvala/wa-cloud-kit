import { resolveConfig, type WaClientConfig } from "./config.js";
import {
  UploadMediaInputSchema,
  UploadMediaResponseSchema,
  buildUploadForm,
  type UploadMediaInput,
  type UploadMediaResult,
} from "./media/upload.js";
import {
  SendMessageResponseSchema,
  parseInput,
  toSendMessageResult,
  type SendMessageResult,
} from "./messages/common.js";
import { buildDocumentMessage, type SendDocumentInput } from "./messages/document.js";
import { buildTemplateMessage, type SendTemplateInput } from "./messages/template.js";
import { buildTextMessage, type SendTextInput } from "./messages/text.js";
import { request } from "./transport.js";

export interface RequestOptions {
  signal?: AbortSignal;
}

/**
 * A client bound to one tenant's config. It holds no cache and no mutable
 * state [lib]; create one per request or per tenant.
 */
export interface WaClient {
  /** Text message (F-020). Customer-service-window only (F-031). */
  sendText(input: SendTextInput, opts?: RequestOptions): Promise<SendMessageResult>;
  /** Document message (F-021). Customer-service-window only (F-031). */
  sendDocument(input: SendDocumentInput, opts?: RequestOptions): Promise<SendMessageResult>;
  /** Template message (F-040–F-048). Works outside the window (F-031). */
  sendTemplate(input: SendTemplateInput, opts?: RequestOptions): Promise<SendMessageResult>;
  /** Media upload (F-060). The media ID expires after 30 days (F-062). */
  uploadMedia(input: UploadMediaInput, opts?: RequestOptions): Promise<UploadMediaResult>;
}

/**
 * Validates `config` once (throws `WaValidationError`) and returns a client.
 * Every method validates its input before any network call.
 */
export function createWaClient(config: WaClientConfig): WaClient {
  const resolved = resolveConfig(config);

  const sendJson = async (payload: unknown, opts?: RequestOptions): Promise<SendMessageResult> => {
    const response = await request(
      resolved,
      { path: "messages", json: payload },
      SendMessageResponseSchema,
      opts?.signal,
    );
    return toSendMessageResult(response);
  };

  return {
    // Builders validate synchronously; `async` turns their throw into a rejection.
    sendText: async (input, opts) => sendJson(buildTextMessage(input), opts),
    sendDocument: async (input, opts) => sendJson(buildDocumentMessage(input), opts),
    sendTemplate: async (input, opts) => sendJson(buildTemplateMessage(input), opts),
    uploadMedia: async (input, opts) => {
      const parsed = parseInput(UploadMediaInputSchema, input, "Invalid media upload");
      const response = await request(
        resolved,
        { path: "media", form: buildUploadForm(parsed) },
        UploadMediaResponseSchema,
        opts?.signal,
      );
      return { mediaId: response.id };
    },
  };
}
