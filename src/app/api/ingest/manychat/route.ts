import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { manychatIngestSchema } from "@/lib/validation";
import { upsertContactByPhone } from "@/lib/contacts";
import { withIdempotency } from "@/lib/idempotency";
import { autoEnroll } from "@/lib/sequences";
import { kickEnrollments } from "@/lib/inngest/trigger";
import { normalizePhone } from "@/lib/phone";

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = manychatIngestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const data = parsed.data;

  const phoneRaw = data.phone || data.whatsapp_phone || "";
  const phone = normalizePhone(phoneRaw);
  if (!phone) {
    return NextResponse.json({ error: "Invalid phone" }, { status: 422 });
  }
  const name =
    data.name ||
    [data.first_name, data.last_name].filter(Boolean).join(" ") ||
    null;

  const idemKey =
    data.idempotencyKey ||
    createHash("sha256").update(phone + "|manychat|" + JSON.stringify(data)).digest("hex");

  const outcome = await withIdempotency(idemKey, "ingest:manychat", async () => {
    const { contact, isNew } = await upsertContactByPhone({
      phone: phoneRaw,
      name,
      email: data.email || null,
      segment: data.segment ?? null,
      source: data.source ?? "manychat",
      attributionPayload: data as Record<string, unknown>,
    });
    const enrolled = await autoEnroll({
      triggerType: "lead_created",
      contactId: contact.id,
      context: { source: "manychat", segment: data.segment },
    });
    await kickEnrollments(enrolled);
    return { contactId: contact.id, isNew };
  });

  if (!outcome.processed) return NextResponse.json({ ok: true, duplicate: true });
  return NextResponse.json({ ok: true, ...outcome.result });
}
