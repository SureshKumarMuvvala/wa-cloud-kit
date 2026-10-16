import { z } from "zod";

const MediaIdSchema = z.string().regex(/^[A-Za-z0-9_-]+$/); // [lib] path-safe

/** Input for `getMediaUrl` (F-130). */
export const GetMediaUrlInputSchema = z.strictObject({ mediaId: MediaIdSchema });
export type GetMediaUrlInput = z.input<typeof GetMediaUrlInputSchema>;

/** `GET /{media-id}` response (F-130). Loose; the URL must be https. */
export const GetMediaUrlResponseSchema = z.looseObject({
  id: z.string(),
  url: z.url({ protocol: /^https$/ }),
  mime_type: z.string().optional(),
  sha256: z.string().optional(),
  file_size: z.string().optional(),
  messaging_product: z.string().optional(),
});
export type GetMediaUrlResponse = z.output<typeof GetMediaUrlResponseSchema>;

/**
 * Result of `getMediaUrl`. The URL is valid for 5 minutes (F-131), and a plain
 * GET without a token does not return the file (F-131): pass it to
 * `downloadMedia`. `fileSize` is parsed from the string Meta sends (F-130);
 * a non-numeric value leaves it undefined [lib].
 */
export interface GetMediaUrlResult {
  mediaId: string;
  url: string;
  mimeType?: string;
  sha256?: string;
  fileSize?: number;
  raw: GetMediaUrlResponse;
}

export function toGetMediaUrlResult(raw: GetMediaUrlResponse): GetMediaUrlResult {
  const size = raw.file_size === undefined ? Number.NaN : Number(raw.file_size);
  const fileSize = raw.file_size !== undefined && /^\d+$/.test(raw.file_size) ? size : undefined;
  return {
    mediaId: raw.id,
    url: raw.url,
    ...(raw.mime_type === undefined ? {} : { mimeType: raw.mime_type }),
    ...(raw.sha256 === undefined ? {} : { sha256: raw.sha256 }),
    ...(fileSize === undefined ? {} : { fileSize }),
    raw,
  };
}

/** Input for `deleteMedia` (F-134). */
export const DeleteMediaInputSchema = z.strictObject({ mediaId: MediaIdSchema });
export type DeleteMediaInput = z.input<typeof DeleteMediaInputSchema>;

/** Delete response (F-134). `success` is required [lib]. */
export const DeleteMediaResponseSchema = z.looseObject({ success: z.boolean() });
export type DeleteMediaResponse = z.output<typeof DeleteMediaResponseSchema>;
export interface DeleteMediaResult {
  success: boolean;
  raw: DeleteMediaResponse;
}
