import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { autoEnroll } from "@/lib/sequences";
import { kickEnrollments } from "@/lib/inngest/trigger";
import { RENEWAL_ALERT_DAYS } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Daily renewal scan — enroll memberships expiring at 30/15/7 days. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const now = new Date();
  let enrolled = 0;
  const allEnrolled: string[] = [];
  for (const days of RENEWAL_ALERT_DAYS) {
    const start = new Date(now);
    start.setDate(start.getDate() + days);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    const memberships = await prisma.membership.findMany({
      where: { isActive: true, expiryDate: { gte: start, lte: end } },
    });
    for (const m of memberships) {
      const ids = await autoEnroll({
        triggerType: "membership_expiring",
        contactId: m.contactId,
        context: { daysToExpiry: days },
      });
      allEnrolled.push(...ids);
      enrolled += ids.length;
    }
  }
  await kickEnrollments(allEnrolled);
  return NextResponse.json({ ok: true, enrolled });
}
