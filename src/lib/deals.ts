import { prisma } from "./prisma";
import { setStage } from "./contacts";
import { enforceExits, autoEnroll } from "./sequences";
import { kickEnrollments } from "./inngest/trigger";
import { logActivity } from "./activity";
import { writeAudit } from "./audit";
import { addYears } from "date-fns";
import type { DealStatus, DealTier, Prisma, Stage } from "@prisma/client";

const STAGE_FOR_TIER: Record<DealTier, Stage> = {
  workshop: "workshop_registered",
  base: "base_member",
  vip: "vip_member",
  renewal: "renewed",
};

/**
 * Record/settle a deal for a contact. On a PAID base/vip/renewal:
 *  - create or extend the Membership
 *  - advance the pipeline stage
 *  - exit any "not converted" sales sequences (never chase a closed sale)
 *  - auto-enroll the relevant onboarding/next sequence
 */
export async function processDeal(params: {
  contactId: string;
  tier: DealTier;
  amount: number;
  status: DealStatus;
  paidAt?: Date | null;
  installmentPlan?: Prisma.InputJsonValue | null;
  lostReason?: string | null;
  userId?: string | null;
}) {
  const { contactId, tier, amount, status, userId } = params;

  // Upsert: one open deal per contact+tier is collapsed; otherwise create.
  const existing = await prisma.deal.findFirst({
    where: { contactId, tier, status: { in: ["pending", "partial"] } },
  });

  const deal = existing
    ? await prisma.deal.update({
        where: { id: existing.id },
        data: {
          amount,
          status,
          paidAt: status === "paid" ? (params.paidAt ?? new Date()) : null,
          installmentPlan: params.installmentPlan ?? undefined,
          lostReason: params.lostReason ?? null,
        },
      })
    : await prisma.deal.create({
        data: {
          contactId,
          tier,
          amount,
          status,
          paidAt: status === "paid" ? (params.paidAt ?? new Date()) : null,
          installmentPlan: params.installmentPlan ?? undefined,
          lostReason: params.lostReason ?? null,
        },
      });

  await writeAudit({
    userId,
    action: existing ? "deal.update" : "deal.create",
    entity: "Deal",
    entityId: deal.id,
    before: existing ? { status: existing.status, amount: existing.amount } : null,
    after: { tier, amount, status },
  });
  await logActivity({
    contactId,
    type: "payment",
    channel: "system",
    summary: `Deal ${tier} ${status} — ৳${amount.toLocaleString()}`,
    meta: { dealId: deal.id, tier, status, amount },
  });

  if (status !== "paid") return deal;

  // --- Paid handling ---
  if (tier === "base" || tier === "vip") {
    const expiry = tier === "base" ? addYears(new Date(), 1) : null;
    await prisma.membership.create({
      data: {
        contactId,
        tier,
        startDate: new Date(),
        expiryDate: expiry,
        renewalDate: expiry,
        isActive: true,
        engagement: "active",
      },
    });
  } else if (tier === "renewal") {
    const membership = await prisma.membership.findFirst({
      where: { contactId, isActive: true },
      orderBy: { createdAt: "desc" },
    });
    if (membership) {
      const newExpiry = addYears(
        membership.expiryDate && membership.expiryDate > new Date()
          ? membership.expiryDate
          : new Date(),
        1
      );
      await prisma.membership.update({
        where: { id: membership.id },
        data: { expiryDate: newExpiry, renewalDate: newExpiry, engagement: "active" },
      });
    }
  }

  // Advance stage.
  await setStage({
    contactId,
    stage: STAGE_FOR_TIER[tier],
    userId,
    reason: `paid ${tier}`,
  });

  // Exit "not converted" sequences instantly.
  await enforceExits(contactId, `paid:${tier}`);

  // Auto-enroll the next-step sequence.
  const enrolled = await autoEnroll({
    triggerType: "payment_status",
    contactId,
    context: { tier, status: "paid" },
  });
  await kickEnrollments(enrolled);

  return deal;
}
