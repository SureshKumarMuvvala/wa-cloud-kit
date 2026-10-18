// Public API. Named exports only.
export { createWaClient, type RequestOptions, type WaClient } from "./client.js";
export { createWaBusinessClient, type WaBusinessClient } from "./business-client.js";
export {
  DEFAULT_BASE_URL,
  WaAppConfigSchema,
  WaBusinessConfigSchema,
  WaClientConfigSchema,
  type WaAppConfig,
  type WaBusinessConfig,
  type WaClientConfig,
} from "./config.js";
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
  LIST_MESSAGE_LIMITS,
  ListMessagePayloadSchema,
  REPLY_BUTTON_LIMITS,
  ReplyButtonsPayloadSchema,
  SendListInputSchema,
  SendReplyButtonsInputSchema,
  buildListMessage,
  buildReplyButtonsMessage,
  type ListMessagePayload,
  type ReplyButtonsPayload,
  type SendListInput,
  type SendReplyButtonsInput,
} from "./messages/interactive.js";
export {
  MarkAsReadInputSchema,
  MarkAsReadPayloadSchema,
  MarkAsReadResponseSchema,
  buildMarkAsReadPayload,
  type MarkAsReadInput,
  type MarkAsReadPayload,
  type MarkAsReadResponse,
  type MarkAsReadResult,
} from "./messages/read.js";
export {
  PhoneSuccessResponseSchema,
  PinSchema,
  RegisterPhoneNumberInputSchema,
  SetTwoStepPinInputSchema,
  type PhoneSuccessResponse,
  type PhoneSuccessResult,
  type RegisterPhoneNumberInput,
  type SetTwoStepPinInput,
} from "./phone/register.js";
export {
  ListPhoneNumbersInputSchema,
  ListPhoneNumbersResponseSchema,
  WaPhoneNumberSchema,
  findPhoneNumber,
  type ListPhoneNumbersInput,
  type ListPhoneNumbersResponse,
  type ListPhoneNumbersResult,
  type WaPhoneNumber,
} from "./business/phone-numbers.js";
export {
  SubscribeAppInputSchema,
  SubscribedAppsResponseSchema,
  SubscriptionResponseSchema,
  type ListSubscribedAppsResult,
  type SubscribeAppInput,
  type SubscribedAppsResponse,
  type SubscriptionResponse,
  type SubscriptionResult,
  type WaSubscribedApp,
} from "./business/subscribed-apps.js";
export {
  EMBEDDED_SIGNUP_CANCEL_STEPS,
  EMBEDDED_SIGNUP_FINISH_EVENTS,
  parseEmbeddedSignupEvent,
  type WaEmbeddedSignupEvent,
} from "./signup/event.js";
export {
  ExchangeCodeInputSchema,
  exchangeEmbeddedSignupCode,
  type ExchangeCodeInput,
  type WaBusinessTokenResult,
} from "./signup/exchange.js";
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
  DEFAULT_MEDIA_HOSTS,
  DownloadMediaInputSchema,
  type DownloadMediaInput,
  type DownloadMediaResult,
} from "./media/download.js";
export {
  DeleteMediaInputSchema,
  DeleteMediaResponseSchema,
  GetMediaUrlInputSchema,
  GetMediaUrlResponseSchema,
  type DeleteMediaInput,
  type DeleteMediaResponse,
  type DeleteMediaResult,
  type GetMediaUrlInput,
  type GetMediaUrlResponse,
  type GetMediaUrlResult,
} from "./media/manage.js";
export {
  CreateTemplateInputSchema,
  CreateTemplateResponseSchema,
  TemplateNameSchema,
  type CreateTemplateInput,
  type CreateTemplateResponse,
  type CreateTemplateResult,
} from "./templates/create.js";
export {
  DeleteTemplateInputSchema,
  DeleteTemplateResponseSchema,
  GetTemplateInputSchema,
  ListTemplatesInputSchema,
  ListTemplatesResponseSchema,
  type DeleteTemplateInput,
  type DeleteTemplateResponse,
  type DeleteTemplateResult,
  type GetTemplateInput,
  type ListTemplatesInput,
  type ListTemplatesResponse,
  type ListTemplatesResult,
} from "./templates/manage.js";
export {
  TEMPLATE_CATEGORIES,
  TEMPLATE_FIELDS,
  TEMPLATE_QUALITY_SCORES,
  TEMPLATE_REJECTION_REASONS,
  TEMPLATE_STATUSES,
  WaTemplateSchema,
  isKnownTemplateCategory,
  isKnownTemplateQualityScore,
  isKnownTemplateRejectionReason,
  isKnownTemplateStatus,
  type WaKnownTemplateCategory,
  type WaKnownTemplateQualityScore,
  type WaKnownTemplateRejectionReason,
  type WaKnownTemplateStatus,
  type WaTemplate,
  type WaTemplateField,
} from "./templates/shapes.js";
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
  type WaAccountUpdateEvent,
  type WaTemplateStatusEvent,
  type WaUnhandledChange,
  type WaWebhookContact,
  type WaWebhookEvent,
} from "./webhooks/parse.js";
export {
  DEFAULT_DEDUPE_TTL_SECONDS,
  webhookDedupeKey,
  type WaIdempotencyStore,
} from "./webhooks/dedupe.js";
export {
  createWebhookRouter,
  type WaDuplicateEvent,
  type WaRouteResult,
  type WaRoutedEvent,
  type WaRoutedUnhandledChange,
  type WaRoutingKey,
  type WaTenantResolver,
  type WaUnroutedItem,
  type WaWebhookRouter,
  type WaWebhookRouterOptions,
} from "./webhooks/router.js";
export {
  DELIVERY_STATUS_RANK,
  reduceMessageStatus,
  type WaDeliveryStatus,
  type WaMessageDeliveryState,
} from "./webhooks/status-reducer.js";
export {
  KNOWN_INTERACTIVE_REPLY_TYPES,
  KNOWN_MESSAGE_STATUSES,
  KNOWN_MESSAGE_TYPES,
  PARTNER_ACCOUNT_EVENTS,
  TEMPLATE_STATUS_EVENTS,
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
