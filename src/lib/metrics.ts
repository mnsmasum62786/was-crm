import { prisma } from "./prisma";
import { STAGES } from "./constants";

export async function funnelMetrics() {
  const grouped = await prisma.contact.groupBy({
    by: ["stage"],
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  for (const s of STAGES) counts[s] = 0;
  for (const g of grouped) counts[g.stage] = g._count._all;

  const leads =
    counts.lead +
    counts.workshop_registered +
    counts.workshop_attended +
    counts.base_member +
    counts.vip_member +
    counts.renewed +
    counts.churned;
  const registered =
    counts.workshop_registered +
    counts.workshop_attended +
    counts.base_member +
    counts.vip_member +
    counts.renewed;
  const attended =
    counts.workshop_attended +
    counts.base_member +
    counts.vip_member +
    counts.renewed;
  const base = counts.base_member + counts.vip_member + counts.renewed;
  const vip = counts.vip_member;

  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

  return {
    counts,
    steps: [
      { key: "leads", label: "Leads", value: leads, conv: 100 },
      {
        key: "registered",
        label: "Registered",
        value: registered,
        conv: pct(registered, leads),
      },
      {
        key: "attended",
        label: "Attended",
        value: attended,
        conv: pct(attended, registered),
      },
      { key: "base", label: "Base", value: base, conv: pct(base, attended) },
      { key: "vip", label: "VIP", value: vip, conv: pct(vip, base) },
    ],
  };
}

export async function revenueMetrics() {
  const paid = await prisma.deal.findMany({
    where: { status: "paid" },
    select: { tier: true, amount: true },
  });
  const byTier: Record<string, { count: number; revenue: number }> = {};
  let total = 0;
  for (const d of paid) {
    byTier[d.tier] ??= { count: 0, revenue: 0 };
    byTier[d.tier].count += 1;
    byTier[d.tier].revenue += d.amount;
    total += d.amount;
  }
  return { total, byTier, dealCount: paid.length };
}

export async function channelHealth() {
  const grouped = await prisma.message.groupBy({
    by: ["channel", "status"],
    where: { direction: "out" },
    _count: { _all: true },
  });
  const out: Record<string, Record<string, number>> = {};
  for (const g of grouped) {
    out[g.channel] ??= {};
    out[g.channel][g.status] = g._count._all;
  }
  return out;
}

export async function pipelineForecast() {
  // Potential revenue sitting in "attended, not converted".
  const attended = await prisma.contact.count({
    where: { stage: "workshop_attended" },
  });
  return { attendedNotConverted: attended, potentialBase: attended * 5999 };
}

export async function sourceMix() {
  const grouped = await prisma.contact.groupBy({
    by: ["utmMedium"],
    _count: { _all: true },
  });
  let paid = 0;
  let organic = 0;
  for (const g of grouped) {
    const m = (g.utmMedium ?? "").toLowerCase();
    if (["cpc", "paid", "ppc", "ads", "paid_social"].includes(m)) {
      paid += g._count._all;
    } else {
      organic += g._count._all;
    }
  }
  return { paid, organic };
}

export async function teamPerformance() {
  const users = await prisma.user.findMany({
    where: { role: { in: ["closer", "founder"] } },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          assignedContacts: true,
          assignedTasks: true,
        },
      },
    },
  });
  // Conversions per closer (paid deals on their assigned contacts).
  const result = [];
  for (const u of users) {
    const conversions = await prisma.deal.count({
      where: { status: "paid", contact: { assignedToId: u.id } },
    });
    const tasksDone = await prisma.task.count({
      where: { assignedToId: u.id, status: "done" },
    });
    const tasksOpen = await prisma.task.count({
      where: { assignedToId: u.id, status: "open" },
    });
    result.push({
      id: u.id,
      name: u.name,
      assigned: u._count.assignedContacts,
      conversions,
      tasksDone,
      tasksOpen,
    });
  }
  return result;
}
