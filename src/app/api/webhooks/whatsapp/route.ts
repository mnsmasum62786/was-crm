import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { upsertContactByPhone } from "@/lib/contacts";
import { recordInboundMessage } from "@/lib/messaging";
import { isOptOutMessage } from "@/lib/consent-gate";
import { optOut } from "@/lib/consent";
import { withIdempotency } from "@/lib/idempotency";
import type { MessageStatus } from "@prisma/client";

// Webhook verification handshake.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

type WAStatus = { id: string; status: string };
type WAMessage = { id: string; from: string; text?: { body: string }; type: string };

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    const entries = body?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        const value = change?.value ?? {};

        // Inbound messages.
        for (const msg of (value.messages ?? []) as WAMessage[]) {
          await withIdempotency(`wa:in:${msg.id}`, "webhook:whatsapp", async () => {
            const phone = normalizePhone(msg.from);
            if (!phone) return;
            const { contact } = await upsertContactByPhone({
              phone: msg.from,
              source: "whatsapp_inbound",
            });
            const text = msg.text?.body ?? `[${msg.type}]`;
            await recordInboundMessage({
              contactId: contact.id,
              channel: "whatsapp",
              body: text,
              providerMessageId: msg.id,
            });
            if (isOptOutMessage(text)) {
              await optOut({
                contactId: contact.id,
                channel: "whatsapp",
                source: "whatsapp_stop",
              });
            }
          });
        }

        // Delivery / read status updates.
        for (const st of (value.statuses ?? []) as WAStatus[]) {
          const mapped = mapStatus(st.status);
          if (!mapped) continue;
          await prisma.message.updateMany({
            where: { providerMessageId: st.id },
            data: {
              status: mapped,
              deliveredAt: mapped === "delivered" ? new Date() : undefined,
              readAt: mapped === "read" ? new Date() : undefined,
            },
          });
        }
      }
    }
  } catch (e) {
    console.error("[whatsapp webhook] error", e);
  }

  return NextResponse.json({ ok: true });
}

function mapStatus(s: string): MessageStatus | null {
  switch (s) {
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "read":
      return "read";
    case "failed":
      return "failed";
    default:
      return null;
  }
}
