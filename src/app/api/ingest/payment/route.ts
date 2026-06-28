import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { paymentIngestSchema } from "@/lib/validation";
import { upsertContactByPhone } from "@/lib/contacts";
import { withIdempotency } from "@/lib/idempotency";
import { processDeal } from "@/lib/deals";
import { normalizePhone } from "@/lib/phone";

/**
 * Payment IPN (bKash / aamarPay / SSLCommerz). Idempotent on transactionId so
 * gateway retries never double-process. A successful base/vip/renewal creates a
 * Deal(paid) + Membership, advances the stage and exits sales sequences.
 */
export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = paymentIngestSchema.safeParse(payload);
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

  const idemKey =
    data.idempotencyKey ||
    data.transactionId ||
    createHash("sha256")
      .update(phone + "|" + data.tier + "|" + data.amount + "|" + data.status)
      .digest("hex");

  const outcome = await withIdempotency(idemKey, "ingest:payment", async () => {
    const { contact } = await upsertContactByPhone({
      phone: data.phone,
      name: data.name ?? null,
      email: data.email || null,
      source: data.gateway ?? "payment",
      attributionPayload: data as Record<string, unknown>,
    });

    const deal = await processDeal({
      contactId: contact.id,
      tier: data.tier,
      amount: data.amount,
      status: data.status,
    });

    return { contactId: contact.id, dealId: deal.id, status: data.status };
  });

  if (!outcome.processed) {
    return NextResponse.json({ ok: true, duplicate: true });
  }
  return NextResponse.json({ ok: true, ...outcome.result });
}
