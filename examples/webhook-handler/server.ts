// Minimal multi-tenant WhatsApp webhook handler using only node:http
// (v0.2 spec §6.1, v0.3 spec §2).
//
// Run `pnpm build` first: this imports the built package from ../../dist.
// Config comes from the environment and is never printed:
//   WA_APP_SECRET   the app secret that signs deliveries (F-082)
//   WA_VERIFY_TOKEN the token you typed into the app's webhook settings (F-080)
//   PORT            optional, default 3000
//   WA_DEMO_WABA_ID, WA_DEMO_PHONE_NUMBER_ID  optional: one demo tenant
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  createWebhookRouter,
  parseWebhookPayload,
  reduceMessageStatus,
  verifyWebhookChallenge,
  verifyWebhookSignature,
  type WaIdempotencyStore,
  type WaMessageDeliveryState,
  type WaRoutingKey,
} from "wa-cloud-kit";

const appSecret = process.env.WA_APP_SECRET;
const verifyToken = process.env.WA_VERIFY_TOKEN;
if (
  appSecret === undefined ||
  appSecret === "" ||
  verifyToken === undefined ||
  verifyToken === ""
) {
  console.error("Set WA_APP_SECRET and WA_VERIFY_TOKEN before starting the server.");
  process.exit(1);
}
const port = Number(process.env.PORT ?? "3000");

const MAX_BODY_BYTES = 3 * 1024 * 1024; // payloads are up to 3 MB (F-084)
const MAX_SEEN_KEYS = 10_000;

// DEMO STORAGE ONLY. Meta retries failed deliveries for up to 7 days and
// sends retries to every subscribed app (F-083, F-170), so production needs an
// atomic store shared by every instance (for example Redis `SET key 1 NX EX
// ttl`). This bounded in-memory map ignores the TTL and evicts the oldest key.
const seen = new Map<string, true>();
const demoStore: WaIdempotencyStore = {
  claim: (key) => {
    if (seen.has(key)) {
      return Promise.resolve(false);
    }
    seen.set(key, true);
    if (seen.size > MAX_SEEN_KEYS) {
      const oldest = seen.keys().next();
      if (!oldest.done) {
        seen.delete(oldest.value);
      }
    }
    return Promise.resolve(true);
  },
  release: (key) => {
    seen.delete(key);
    return Promise.resolve();
  },
};

// DEMO TENANT TABLE ONLY. A SaaS looks tenants up in its own database. Keys
// are fake ids; WA_DEMO_PHONE_NUMBER_ID / WA_DEMO_WABA_ID add one tenant.
interface Tenant {
  id: string;
  wabaId: string;
  phoneNumberId: string;
}
const tenants: Tenant[] = [];
if (
  process.env.WA_DEMO_WABA_ID !== undefined &&
  process.env.WA_DEMO_PHONE_NUMBER_ID !== undefined
) {
  tenants.push({
    id: "demo-tenant",
    wabaId: process.env.WA_DEMO_WABA_ID,
    phoneNumberId: process.env.WA_DEMO_PHONE_NUMBER_ID,
  });
}

/** Phone number first; when both ids are present, the tenant must own the WABA (D-30). */
function resolveTenant(key: WaRoutingKey): Tenant | null {
  if (key.phoneNumberId !== undefined) {
    const tenant = tenants.find((t) => t.phoneNumberId === key.phoneNumberId);
    return tenant?.wabaId === key.wabaId ? tenant : null;
  }
  return tenants.find((t) => t.wabaId === key.wabaId) ?? null;
}

const router = createWebhookRouter({ resolveTenant, idempotency: demoStore });

// DEMO ONLY: delivery state per sent message; a SaaS stores it with the invoice.
const deliveries = new Map<string, WaMessageDeliveryState>();

/** Collects the request into one Uint8Array; resolves null if it exceeds the cap. */
async function readRawBody(req: IncomingMessage): Promise<Uint8Array | null> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk as Uint8Array);
    total += buffer.byteLength;
    if (total > MAX_BODY_BYTES) {
      return null;
    }
    chunks.push(buffer);
  }
  return new Uint8Array(Buffer.concat(chunks));
}

function reply(res: ServerResponse, status: number, body = ""): void {
  res.writeHead(status, { "content-type": "text/plain" });
  res.end(body);
}

const server = createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "GET") {
      // Verification handshake (F-080, F-081); the challenge is an opaque string (C-2).
      const check = verifyWebhookChallenge(url.searchParams, verifyToken);
      if (check.ok) {
        reply(res, 200, check.challenge);
      } else {
        reply(res, 403);
      }
      return;
    }

    if (req.method !== "POST") {
      reply(res, 405);
      return;
    }

    // Verify over the RAW bytes. Never JSON.parse and re-serialize first (F-082).
    const rawBody = await readRawBody(req);
    if (rawBody === null) {
      reply(res, 413);
      return;
    }
    const header = req.headers["x-hub-signature-256"];
    const valid = await verifyWebhookSignature({
      rawBody,
      signatureHeader: Array.isArray(header) ? header[0] : header,
      appSecret,
    });
    if (!valid) {
      reply(res, 401); // the docs give no status for a bad signature [lib]
      return;
    }

    let parsed;
    try {
      parsed = parseWebhookPayload(JSON.parse(new TextDecoder().decode(rawBody)));
    } catch {
      reply(res, 400);
      return;
    }

    // Acknowledge immediately, then process (F-083). Production code persists
    // the raw body before answering: there is no API to fetch past webhooks
    // (F-171). Meta documents no response timeout (G-21).
    reply(res, 200);
    const result = await router.route(parsed);
    for (const { tenant, event } of result.routed) {
      if (event.kind === "status") {
        const previous = deliveries.get(event.status.id);
        const state = reduceMessageStatus(previous, event.status);
        deliveries.set(event.status.id, state);
        console.log(`[${tenant.id}] status ${event.status.id} → ${state.current}`);
      } else {
        console.log(`[${tenant.id}] ${event.kind}`);
      }
    }
    for (const { key, reason } of result.unrouted) {
      // Never dropped silently: store or alert in a real handler.
      console.warn(`unrouted ${key.field} (${reason}) waba=${key.wabaId}`);
    }
    for (const { tenant, change } of result.unhandled) {
      console.log(`[${tenant.id}] unhandled field ${change.field}`);
    }
  })().catch(() => {
    if (!res.headersSent) {
      reply(res, 500);
    }
  });
});

// Multi-tenant note [lib inference]: the signature key is the app secret
// (F-082), and a Tech Provider onboards every client through one app (F-157),
// so one secret and one callback URL serve every tenant. Verify this against
// your app configuration before relying on it.
server.listen(port, () => {
  console.log(`Webhook handler listening on port ${String(port)}`);
});
