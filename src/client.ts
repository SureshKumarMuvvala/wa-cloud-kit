import { resolveConfig, type WaClientConfig } from "./config.js";
import {
  DownloadMediaInputSchema,
  downloadMediaFile,
  type DownloadMediaInput,
  type DownloadMediaResult,
} from "./media/download.js";
import {
  DeleteMediaInputSchema,
  DeleteMediaResponseSchema,
  GetMediaUrlInputSchema,
  GetMediaUrlResponseSchema,
  toGetMediaUrlResult,
  type DeleteMediaInput,
  type DeleteMediaResult,
  type GetMediaUrlInput,
  type GetMediaUrlResult,
} from "./media/manage.js";
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
  /**
   * Resolves a media ID to a short-lived URL (F-130). The URL is valid for 5
   * minutes and needs the token to fetch (F-131). `phone_number_id` is always
   * sent, so Meta answers only if the media belongs to this client's number
   * [lib].
   */
  getMediaUrl(input: GetMediaUrlInput, opts?: RequestOptions): Promise<GetMediaUrlResult>;
  /**
   * GETs a media URL with the token (F-132). The token goes only to an https
   * URL whose hostname is in `allowedMediaHosts` (default
   * `DEFAULT_MEDIA_HOSTS`); otherwise `WaValidationError` and nothing is
   * sent (D-8). On `404`, fetch a **new** URL and retry, then renew the token
   * (F-132); the library does not retry.
   */
  downloadMedia(input: DownloadMediaInput, opts?: RequestOptions): Promise<DownloadMediaResult>;
  /** `getMediaUrl` then `downloadMedia` with defaults. No automatic retry [lib]. */
  downloadMediaById(input: GetMediaUrlInput, opts?: RequestOptions): Promise<DownloadMediaResult>;
  /**
   * Deletes uploaded media (F-134). Uploaded media persists 30 days unless
   * deleted earlier (F-136); webhook media IDs are downloadable for 7 days
   * (F-062).
   */
  deleteMedia(input: DeleteMediaInput, opts?: RequestOptions): Promise<DeleteMediaResult>;
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
      { method: "POST", path: `${resolved.phoneNumberId}/messages`, json: payload },
      SendMessageResponseSchema,
      opts?.signal,
    );
    return toSendMessageResult(response);
  };

  const getMediaUrl = async (
    input: GetMediaUrlInput,
    opts?: RequestOptions,
  ): Promise<GetMediaUrlResult> => {
    const parsed = parseInput(GetMediaUrlInputSchema, input, "Invalid media request");
    const response = await request(
      resolved,
      {
        method: "GET",
        path: parsed.mediaId,
        query: { phone_number_id: resolved.phoneNumberId }, // F-130
      },
      GetMediaUrlResponseSchema,
      opts?.signal,
    );
    return toGetMediaUrlResult(response);
  };

  const downloadMedia = async (
    input: DownloadMediaInput,
    opts?: RequestOptions,
  ): Promise<DownloadMediaResult> => {
    const parsed = parseInput(DownloadMediaInputSchema, input, "Invalid media download");
    return downloadMediaFile(resolved, parsed, opts?.signal);
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
        {
          method: "POST",
          path: `${resolved.phoneNumberId}/media`,
          form: buildUploadForm(parsed),
        },
        UploadMediaResponseSchema,
        opts?.signal,
      );
      return { mediaId: response.id };
    },
    getMediaUrl,
    downloadMedia,
    downloadMediaById: async (input, opts) => {
      const { url } = await getMediaUrl(input, opts);
      return downloadMedia({ url }, opts);
    },
    deleteMedia: async (input, opts) => {
      const parsed = parseInput(DeleteMediaInputSchema, input, "Invalid media request");
      const response = await request(
        resolved,
        {
          method: "DELETE",
          path: parsed.mediaId,
          query: { phone_number_id: resolved.phoneNumberId }, // F-134
        },
        DeleteMediaResponseSchema,
        opts?.signal,
      );
      return { success: response.success, raw: response };
    },
  };
}
