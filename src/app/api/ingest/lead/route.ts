import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { leadIngestSchema } from "@/lib/validation";
import { upsertContactByPhone } from "@/lib/contacts";
import { withIdempotency } from "@/lib/idempotency";
import { autoEnroll } from "@/lib/sequences";
import { kickEnrollments } from "@/lib/inngest/trigger";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = leadIngestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const data = parsed.data;

  const phone = normalizePhone(data.phone);
  if (!phone) {
    return NextResponse.json({ error: "Invalid phone" }, { status: 422 });
  }

  // Idempotency: explicit key, or derived from phone + source + body hash.
  const idemKey =
    data.idempotencyKey ||
    createHash("sha256")
      .update(phone + "|" + (data.source ?? "") + "|" + JSON.stringify(data))
      .digest("hex");

  const outcome = await withIdempotency(idemKey, "ingest:lead", async () => {
    const { contact, isNew } = await upsertContactByPhone({
      phone: data.phone,
      name: data.name ?? null,
      email: data.email || null,
      fbProfileUrl: data.fbProfileUrl ?? null,
      segment: data.segment ?? null,
      source: data.source ?? "landing_form",
      attributionPayload: data as Record<string, unknown>,
    });

    // Optional batch registration.
    if (data.batchId) {
      await prisma.registration.upsert({
        where: {
          contactId_batchId: { contactId: contact.id, batchId: data.batchId },
        },
        create: { contactId: contact.id, batchId: data.batchId },
        update: {},
      });
    }

    // Auto-enroll into matching sequences.
    const enrolled = await autoEnroll({
      triggerType: "lead_created",
      contactId: contact.id,
      context: { source: data.source, segment: data.segment },
    });
    await kickEnrollments(enrolled);

    return { contactId: contact.id, isNew, enrolled: enrolled.length };
  });

  if (!outcome.processed) {
    return NextResponse.json({ ok: true, duplicate: true });
  }
  return NextResponse.json({ ok: true, ...outcome.result });
}
