# Source excerpt: phone-registration

- URL: <https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/registration.md>
- Retrieved: 2026-10-18
- Format: Markdown (HTML entities decoded)
- Raw sha256: `bd2b4db866d771a4786b76181904159d3a0d8db3ce39061f9f8b43ca4069a6b6` (9489 bytes)

Verbatim lines from the page, selected because docs/facts.md cites them. This is not a full copy; read the URL for context.

```text
To use your business phone number with Cloud API you must register it. You can only register a number via the API — you cannot register a number through [WhatsApp Manager](https://business.facebook.com) (WAM) or the App Dashboard.
To register your verified business phone number, make a `POST` call to `PHONE_NUMBER_ID/register`. Include the parameters listed below.
Requests to the registration endpoint are limited to 10 requests per business number in a 72-hour moving window.
When you make a registration request, the API checks how many registration requests you have made to register that number in the last 72 hours. If you have already made 10 requests, the API will return error code `133016`, and the API prevents the number from being registered for the next 72 hours.
| `pin` | **Required.**<br><br>If your verified business phone number already has two-step verification enabled, set this value to your number's 6-digit two-step verification PIN. If you cannot recall your PIN, you can change it. See [Two-step verification](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers#two-step-verification).<br><br>If your verified business phone number does not have two-step verification enabled, set this value to a 6-digit number. This will be the newly verified business phone number's two-step verification PIN. |
| `data_localization_region` | **Optional.**<br><br>If included, enables [local storage](https://developers.facebook.com/documentation/business-messaging/whatsapp/local-storage) on the business phone number. Value must be a 2-letter ISO 3166 country code (for example, `IN`) indicating the country where you want data-at-rest to be stored.<br><br>Supported values:<br><br>**APAC**<br><br>* Australia: `AU`<br>* Indonesia: `ID`<br>* India: `IN`<br>* Japan: `JP`<br>* Singapore: `SG`<br>* South Korea: `KR`<br><br>**Europe**<br><br>* EU (Germany): `DE`<br>* Switzerland: `CH`<br>* United Kingdom: `GB`<br><br>**LATAM**<br><br>* Brazil: `BR`<br><br>**MEA**<br><br>* Bahrain: `BH`<br>* South Africa: `ZA`<br>* United Arab Emirates: `AE`<br><br>**NORAM**<br><br>* Canada: `CA`<br><br>Once you enable local storage, you cannot disable or change local storage directly. Instead, you must [deregister](#deregister) the number and register it again without this parameter (to disable), or include the parameter with the new country code (to change).<br><br>If the number is already registered, deregister it, then register it again with this parameter to enable local storage. |
```
