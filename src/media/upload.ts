import { z } from "zod";

/**
 * MIME types accepted by `uploadMedia` in v0.1: the documented document types
 * plus JPEG and PNG (F-063, D-2). Audio, video and stickers are out of scope.
 */
export const SUPPORTED_UPLOAD_MIME_TYPES = [
  // documents (F-063)
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/pdf",
  // images (F-063); must be 8-bit RGB or RGBA
  "image/jpeg",
  "image/png",
] as const; // F-063
export type SupportedUploadMimeType = (typeof SUPPORTED_UPLOAD_MIME_TYPES)[number];

const DOCUMENT_MAX_BYTES = 100_000_000; // F-063: 100 MB (decimal MB, G-8)
const IMAGE_MAX_BYTES = 5_000_000; // F-063: 5 MB (decimal MB, G-8)

/** Maximum upload size in bytes per MIME type (F-063; MB read as 10^6 bytes, G-8). */
export const MAX_UPLOAD_BYTES: Readonly<Record<SupportedUploadMimeType, number>> = {
  "text/plain": DOCUMENT_MAX_BYTES,
  "application/vnd.ms-excel": DOCUMENT_MAX_BYTES,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": DOCUMENT_MAX_BYTES,
  "application/msword": DOCUMENT_MAX_BYTES,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": DOCUMENT_MAX_BYTES,
  "application/vnd.ms-powerpoint": DOCUMENT_MAX_BYTES,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": DOCUMENT_MAX_BYTES,
  "application/pdf": DOCUMENT_MAX_BYTES,
  "image/jpeg": IMAGE_MAX_BYTES,
  "image/png": IMAGE_MAX_BYTES,
}; // F-063

/**
 * Media upload input (F-060). The file is checked against
 * {@link MAX_UPLOAD_BYTES} before any request is sent.
 *
 * The returned media ID expires 30 days after upload (F-062), so upload close
 * to send time.
 */
export const UploadMediaInputSchema = z
  .strictObject({
    file: z.instanceof(Blob),
    mimeType: z.enum(SUPPORTED_UPLOAD_MIME_TYPES),
    filename: z.string().min(1),
  })
  .superRefine((input, ctx) => {
    const limit = MAX_UPLOAD_BYTES[input.mimeType];
    if (input.file.size > limit) {
      ctx.addIssue({
        code: "custom",
        message: `File is ${String(input.file.size)} bytes; the limit for ${input.mimeType} is ${String(limit)} bytes (F-063)`,
        path: ["file"],
      });
    }
  });
export type UploadMediaInput = z.input<typeof UploadMediaInputSchema>;

/** Upload response (F-061). */
export const UploadMediaResponseSchema = z.looseObject({ id: z.string().min(1) }); // F-061
export type UploadMediaResponse = z.output<typeof UploadMediaResponseSchema>;

export interface UploadMediaResult {
  mediaId: string;
}

/**
 * Builds the multipart form (F-060, C-4): `messaging_product=whatsapp`,
 * `type=<mimeType>`, and `file` as a Blob typed with `mimeType` plus the
 * filename. No Content-Type header is set; fetch adds the boundary.
 */
export function buildUploadForm(input: z.output<typeof UploadMediaInputSchema>): FormData {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", input.mimeType);
  form.append("file", input.file.slice(0, input.file.size, input.mimeType), input.filename);
  return form;
}
