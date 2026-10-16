// Public API. Named exports only.
export { createWaClient, type RequestOptions, type WaClient } from "./client.js";
export { DEFAULT_BASE_URL, WaClientConfigSchema, type WaClientConfig } from "./config.js";
export {
  GraphErrorEnvelopeSchema,
  HTTP_ERROR_BODY_MAX_CHARS,
  WaApiError,
  WaError,
  WaHttpError,
  WaResponseShapeError,
  WaTransportError,
  WaValidationError,
  waErrorCategory,
  type GraphErrorEnvelope,
  type WaErrorCategory,
} from "./errors.js";
export {
  MediaRefSchema,
  RecipientSchema,
  SendMessageResponseSchema,
  type MediaRef,
  type MessageStatusOnSend,
  type SendMessageResponse,
  type SendMessageResult,
} from "./messages/common.js";
export {
  SendTextInputSchema,
  TextMessagePayloadSchema,
  buildTextMessage,
  type SendTextInput,
  type TextMessagePayload,
} from "./messages/text.js";
export {
  DocumentMessagePayloadSchema,
  SendDocumentInputSchema,
  buildDocumentMessage,
  type DocumentMessagePayload,
  type SendDocumentInput,
} from "./messages/document.js";
export {
  CurrencyParamSchema,
  DateTimeParamSchema,
  NamedTextParamSchema,
  SendTemplateInputSchema,
  TemplateBodySchema,
  TemplateMessagePayloadSchema,
  TextParamSchema,
  buildTemplateMessage,
  type CurrencyParam,
  type DateTimeParam,
  type NamedTextParam,
  type PositionalParam,
  type SendTemplateInput,
  type TemplateBody,
  type TemplateMessagePayload,
  type TextParam,
} from "./messages/template.js";
export {
  MAX_UPLOAD_BYTES,
  SUPPORTED_UPLOAD_MIME_TYPES,
  UploadMediaInputSchema,
  UploadMediaResponseSchema,
  type SupportedUploadMimeType,
  type UploadMediaInput,
  type UploadMediaResponse,
  type UploadMediaResult,
} from "./media/upload.js";
export {
  verifyWebhookChallenge,
  type WebhookChallengeQuery,
  type WebhookChallengeResult,
} from "./webhooks/verify-challenge.js";
export {
  verifyWebhookSignature,
  type VerifyWebhookSignatureInput,
} from "./webhooks/verify-signature.js";
export {
  parseWebhookPayload,
  type ParsedWebhook,
  type WaWebhookContact,
  type WaWebhookEvent,
} from "./webhooks/parse.js";
export {
  KNOWN_MESSAGE_STATUSES,
  KNOWN_MESSAGE_TYPES,
  WebhookEnvelopeSchema,
  type WaInboundMessage,
  type WaKnownMessageStatus,
  type WaMessageStatus,
  type WaWebhookError,
} from "./webhooks/schemas.js";
export {
  DEFAULT_SIGNATURE_SEPARATOR,
  RenderSignatureInputSchema,
  TEMPLATE_BODY_MAX_CHARS,
  TenantSignatureSchema,
  assertTemplateBodyLength,
  renderSignatureParameter,
  type RenderSignatureInput,
  type TenantSignature,
} from "./signature/render.js";
