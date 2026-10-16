// Webhook fixtures shaped like the Meta doc examples (sources/wh-*.md,
// incoming-webhook-payload.md). Every ID and sample value is replaced by a
// test fake; only the structure and documented error titles are kept.
import {
  TEST_DISPLAY_PHONE_NUMBER,
  TEST_PHONE_NUMBER_ID,
  TEST_RECIPIENT_WA_ID,
  TEST_WABA_ID,
} from "../helpers/ids.js";

export const METADATA = {
  display_phone_number: TEST_DISPLAY_PHONE_NUMBER,
  phone_number_id: TEST_PHONE_NUMBER_ID,
};

export const CONTACT = { profile: { name: "Test User" }, wa_id: TEST_RECIPIENT_WA_ID };

export function envelope(changes: readonly unknown[], wabaId = TEST_WABA_ID): unknown {
  return { object: "whatsapp_business_account", entry: [{ id: wabaId, changes }] };
}

export function messagesChange(value: Record<string, unknown>): unknown {
  return {
    field: "messages",
    value: { messaging_product: "whatsapp", metadata: METADATA, ...value },
  };
}

export const TEXT_MESSAGE = {
  from: TEST_RECIPIENT_WA_ID,
  id: "wamid.TESTTEXT",
  timestamp: "1790000001",
  type: "text",
  text: { body: "Is my invoice ready?" },
};

export const DOCUMENT_MESSAGE = {
  from: TEST_RECIPIENT_WA_ID,
  id: "wamid.TESTDOC",
  timestamp: "1790000002",
  type: "document",
  document: {
    caption: "Payment receipt",
    filename: "payment-receipt.pdf",
    mime_type: "application/pdf",
    sha256: "dGVzdC1zaGEyNTYtZG9jdW1lbnQ=",
    id: "3000000000011",
    url: "https://media.example.test/attachments/3000000000011",
  },
};

export const IMAGE_MESSAGE = {
  from: TEST_RECIPIENT_WA_ID,
  id: "wamid.TESTIMG",
  timestamp: "1790000003",
  type: "image",
  image: {
    caption: "Shop front",
    mime_type: "image/jpeg",
    sha256: "dGVzdC1zaGEyNTYtaW1hZ2U=",
    id: "3000000000012",
  },
};

export const BUTTON_MESSAGE = {
  context: { from: "15550000000", id: "wamid.TESTTEMPLATE" },
  from: TEST_RECIPIENT_WA_ID,
  id: "wamid.TESTBUTTON",
  timestamp: "1790000004",
  type: "button",
  button: { payload: "Pay now", text: "Pay now" },
};

export const UNSUPPORTED_MESSAGE = {
  from: TEST_RECIPIENT_WA_ID,
  id: "wamid.TESTUNSUPPORTED",
  timestamp: "1790000005",
  type: "unsupported",
  unsupported: { type: "edit" },
  errors: [
    {
      code: 131051,
      title: "Message type unknown",
      message: "Message type unknown",
      error_data: { details: "Message type is currently not supported." },
    },
  ],
};

export const STATUS_SENT = {
  id: "wamid.TESTOUT1",
  status: "sent",
  timestamp: "1790000001",
  recipient_id: TEST_RECIPIENT_WA_ID,
  conversation: { id: "conv-test-1", origin: { type: "utility" } },
  pricing: { billable: true, pricing_model: "PMP", type: "regular", category: "utility" },
};

export const STATUS_FAILED = {
  id: "wamid.TESTOUT2",
  status: "failed",
  timestamp: "1790000006",
  recipient_id: TEST_RECIPIENT_WA_ID,
  errors: [
    {
      code: 131047,
      title: "Re-engagement message",
      message: "Re-engagement message",
      error_data: { details: "Message failed to send because more than 24 hours have passed." },
      href: "/documentation/business-messaging/whatsapp/support/error-codes",
    },
  ],
};

export function status(value: string, id = "wamid.TESTOUT3"): Record<string, unknown> {
  return { id, status: value, timestamp: "1790000007", recipient_id: TEST_RECIPIENT_WA_ID };
}

export const VALUE_ERROR = {
  code: 130429,
  title: "Rate limit hit",
  message: "Rate limit hit",
  error_data: {
    details:
      "Message failed to send because there were too many messages sent from this phone number in a short period of time",
  },
  href: "/documentation/business-messaging/whatsapp/support/error-codes",
};
