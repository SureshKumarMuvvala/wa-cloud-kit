# Source excerpt: media-guide

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media.md>
- Retrieved: 2026-10-16
- Format: Markdown (HTML entities decoded)
- Raw sha256: `fc9a13003c02d63a63d1f8cb81c06d03b75c24054939c1fb3cc1a74f5f9c03a5` (11322 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
Media IDs returned by the API expire after 30 days. Media IDs in webhooks expire after 7 days.
| `file` | **Required.**<br><br>Path to the file stored in your local directory. For example: "@/local/path/file.jpg". |
| `type` | **Required.**<br><br>Type of media file being uploaded. See [Supported Media Types](#supported-media-types) for more information. |
| `messaging_product` | **Required.**<br><br>Messaging service used for the request. In this case, use `whatsapp`. |
curl 'https://graph.facebook.com/<API_VERSION>/<PHONE_NUMBER_ID>/media' \
-H 'Authorization: Bearer <ACCESS_TOKEN>' \
-F 'messaging_product=whatsapp' \
-F 'file=@<FILE_PATH_AND_NAME>;type=<MIME_TYPE>'
curl 'https://graph.facebook.com/v25.0/106540352242922/media' \
-H 'Authorization: Bearer EAAJB...' \
-F 'file=@/media/template_assets/black_friday_2025.mp4;type=video/mp4'
Media URLs **expire after 5 minutes**, after which you must query the ID again to get a new URL.
curl 'https://graph.facebook.com/<API_VERSION>/<MEDIA_ID>?phone_number_id=<BUSINESS_PHONE_NUMBER_ID>' \
-H 'Authorization: Bearer EAAJB'
curl -X DELETE 'https://graph.facebook.com/<API_VERSION>/<MEDIA_ID>?phone_number_id=<BUSINESS_PHONE_NUMBER_ID>' \
-H 'Authorization: Bearer EAAJB...'
curl '<MEDIA_URL>' \
| AAC | .aac | audio/aac | 16 MB |
| AMR | .amr | audio/amr | 16 MB |
| MP3 | .mp3 | audio/mpeg | 16 MB |
| MP4 Audio | .m4a | audio/mp4 | 16 MB |
| OGG Audio | .ogg | audio/ogg (OPUS codecs only; base audio/ogg not supported; mono input only) | 16 MB |
| Text | .txt | text/plain | 100 MB |
| Microsoft Excel | .xls | application/vnd.ms-excel | 100 MB |
| Microsoft Excel | .xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 100 MB |
| Microsoft Word | .doc | application/msword | 100 MB |
| Microsoft Word | .docx | application/vnd.openxmlformats-officedocument.wordprocessingml.document | 100 MB |
| Microsoft PowerPoint | .ppt | application/vnd.ms-powerpoint | 100 MB |
| Microsoft PowerPoint | .pptx | application/vnd.openxmlformats-officedocument.presentationml.presentation | 100 MB |
| PDF | .pdf | application/pdf | 100 MB |
Images must be 8-bit, RGB or RGBA.
| JPEG | .jpeg | image/jpeg | 5 MB |
| PNG | .png | image/png | 5 MB |
| Animated sticker | .webp | image/webp | 500 KB |
| Static sticker | .webp | image/webp | 100 KB |
| 3GPP | .3gp | video/3gpp | 16 MB |
| MP4 Video | .mp4 | video/mp4 | 16 MB |
Note that mismatched MIME type (`131053`) is a common error. Inspect your media files to verify their MIME type. Make sure that your file name extensions reflect their types. For example, if you are using UNIX, you can inspect a file via the command line to determine its MIME type:
The maximum supported file size for media messages on Cloud API is 100MB. In the event the customer sends a file that is greater than 100MB, you will receive a webhook with error code [131052](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes#other-errors) and `title`:
```
