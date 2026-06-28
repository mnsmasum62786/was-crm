import { inngest } from "./client";
import {
  advanceEnrollment,
  processDueEnrollments,
  autoEnroll,
} from "../sequences";
import { prisma } from "../prisma";
import { RENEWAL_ALERT_DAYS } from "../constants";

// Advance one enrollment as soon as it's started (durable, retried).
export const enrollmentStarted = inngest.createFunction(
  { id: "enrollment-started", retries: 3 },
  { event: "sequence/enrollment.started" },
  async ({ event, step }) => {
    const enrollmentId = event.data.enrollmentId as string;
    await step.run("advance", () => advanceEnrollment(enrollmentId));
    return { enrollmentId };
  }
);

// Tick: process every due enrollment (durable delays land here when due).
export const sequenceTick = inngest.createFunction(
  { id: "sequence-tick" },
  { cron: "* * * * *" },
  async ({ step }) => {
    const count = await step.run("process-due", () => processDueEnrollments(200));
    return { processed: count };
  }
);

// Daily renewal scan: enroll memberships expiring at 30/15/7 days.
export const renewalScan = inngest.createFunction(
  { id: "renewal-scan" },
  { cron: "0 6 * * *" },
  async ({ step }) => {
    return step.run("scan", async () => {
      const now = new Date();
      let enrolled = 0;
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
          enrolled += ids.length;
        }
      }
      return { enrolled };
    });
  }
);

export const functions = [enrollmentStarted, sequenceTick, renewalScan];
