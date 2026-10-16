// Minimal WhatsApp webhook handler using only node:http (v0.2 spec §6.1).
//
// Run `pnpm build` first: this imports the built package from ../../dist.
// Config comes from the environment and is never printed:
//   WA_APP_SECRET   the app secret that signs deliveries (F-082)
//   WA_VERIFY_TOKEN the token you typed into the app's webhook settings (F-080)
//   PORT            optional, default 3000
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  parseWebhookPayload,
  verifyWebhookChallenge,
  verifyWebhookSignature,
  type WaWebhookEvent,
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

// DEMO STORAGE ONLY. Meta retries failed deliveries for 7 days and may send
// duplicates (F-083, F-084, C-1), so production needs storage shared by every
// instance. This bounded in-memory map evicts the oldest key when full.
const seen = new Map<string, true>();

function firstSighting(key: string): boolean {
  if (seen.has(key)) {
    return false;
  }
  seen.set(key, true);
  if (seen.size > MAX_SEEN_KEYS) {
    const oldest = seen.keys().next();
    if (!oldest.done) {
      seen.delete(oldest.value);
    }
  }
  return true;
}

/** The dedupe key for an event: message id, status id + status, or the §5 template key. */
function dedupeKey(event: WaWebhookEvent): string | undefined {
  switch (event.kind) {
    case "message":
      return event.message.id;
    case "status":
      return `${event.status.id}:${event.status.status}`;
    case "template_status":
      return `${event.wabaId}:${event.templateId}:${event.event}:${String(event.eventTime ?? "")}`;
    case "error":
      return undefined;
  }
}

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

function handle(event: WaWebhookEvent): void {
  // The tenant is identified by the WABA (every event) and, for messages and
  // statuses, the phone number (F-085, F-117).
  const tenant =
    event.kind === "template_status"
      ? `waba=${event.wabaId}`
      : `waba=${event.wabaId} phone=${event.phoneNumberId}`;
  console.log(`[${tenant}] ${event.kind}`);
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

    // Acknowledge immediately, then process (F-083).
    reply(res, 200);
    for (const event of parsed.events) {
      const key = dedupeKey(event);
      if (key === undefined || firstSighting(key)) {
        handle(event);
      }
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
