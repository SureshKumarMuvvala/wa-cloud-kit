// Derived from the send-message response example (F-011) with fake IDs.
export const SEND_RESPONSE = {
  messaging_product: "whatsapp",
  contacts: [{ input: "+15550000001", wa_id: "15550000001" }],
  messages: [{ id: "wamid.TEST000000000000000000000001" }],
} as const;

export const SEND_RESPONSE_PACED = {
  messaging_product: "whatsapp",
  contacts: [{ input: "+15550000001", wa_id: "15550000001" }],
  messages: [{ id: "wamid.TEST000000000000000000000002", message_status: "accepted" }],
} as const;
