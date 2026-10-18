// Server side of Embedded Signup v4 for a Tech Provider (v0.3 spec §3.7,
// steps 1-4). The browser part (FB.login, the message listener) is not shown.
//
// Run `pnpm build` first: this imports the built package from ../../dist.
// Usage: node complete-signup.js '<session event JSON>' <code>
// Config comes from the environment and is never printed:
//   WA_APP_ID, WA_APP_SECRET   the app that runs Embedded Signup (F-203)
//   WA_API_VERSION             e.g. v25.0
//   WA_PIN                     6-digit two-step PIN for the new number (F-208)
import {
  WaApiError,
  createWaBusinessClient,
  createWaClient,
  exchangeEmbeddedSignupCode,
  findPhoneNumber,
  parseEmbeddedSignupEvent,
} from "wa-cloud-kit";

const { WA_APP_ID, WA_APP_SECRET, WA_API_VERSION, WA_PIN } = process.env;
const [eventJson, code] = process.argv.slice(2);
if (
  WA_APP_ID === undefined ||
  WA_APP_SECRET === undefined ||
  WA_API_VERSION === undefined ||
  WA_PIN === undefined ||
  eventJson === undefined ||
  code === undefined
) {
  console.error(
    "Set WA_APP_ID, WA_APP_SECRET, WA_API_VERSION, WA_PIN; pass the event JSON and the code.",
  );
  process.exit(1);
}

async function main(
  event: string,
  signupCode: string,
  appId: string,
  appSecret: string,
  version: string,
  pin: string,
): Promise<void> {
  // Step 0: the browser-sent event is untrusted input (D-39).
  const parsed = parseEmbeddedSignupEvent(JSON.parse(event) as unknown);
  if (parsed.kind !== "finish") {
    console.log(`Flow did not finish: ${parsed.kind}`);
    return;
  }

  // Step 1: exchange immediately; the code lives 30 seconds (F-202).
  const { accessToken } = await exchangeEmbeddedSignupCode(
    { appId, appSecret, graphApiVersion: version },
    { code: signupCode },
  );
  // Store the token for this tenant now (encrypted). Never log it.

  // Step 2: confirm the WABA and number with the tenant's own token (D-36).
  const business = createWaBusinessClient({
    wabaId: parsed.wabaId,
    accessToken,
    graphApiVersion: version,
  });
  const numbers = await business.listPhoneNumbers();
  if (
    parsed.phoneNumberId !== undefined &&
    findPhoneNumber(numbers, parsed.phoneNumberId) === undefined
  ) {
    throw new Error("The phone number from the event is not on this WABA; stop onboarding.");
  }

  // Step 3: subscribe the app to the tenant WABA's webhooks (F-157, F-173).
  await business.subscribeApp();

  // Step 4: register the number (10 tries per 72 h, within 14 days; F-209, F-210).
  // FINISH_ONLY_WABA has no number to register (F-200).
  if (parsed.phoneNumberId !== undefined) {
    const phone = createWaClient({
      phoneNumberId: parsed.phoneNumberId,
      accessToken,
      graphApiVersion: version,
    });
    await phone.registerPhoneNumber({ pin });
  }

  // Step 5 is not an API: the tenant adds a payment method in WhatsApp Manager (F-160).
  console.log(`Onboarded WABA ${parsed.wabaId}. Ask the tenant to add a payment method.`);
}

main(eventJson, code, WA_APP_ID, WA_APP_SECRET, WA_API_VERSION, WA_PIN).catch((error: unknown) => {
  // Error messages never contain the token, secret, code or PIN (v0.3 §3.8).
  console.error(
    error instanceof WaApiError ? `Graph error ${String(error.code)}: ${error.message}` : error,
  );
  process.exit(1);
});
