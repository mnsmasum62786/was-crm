import { prisma } from "./prisma";
import { evaluateSequenceExit, type ExitConditions } from "./sequence-exit";
import { sendMessage } from "./messaging";
import { logActivity } from "./activity";
import { renderTemplate } from "./utils";
import type { Contact, DelayUnit, Enrollment } from "@prisma/client";

// ----------------------- enrollment & triggers -----------------------

function delayToMs(amount: number, unit: DelayUnit): number {
  const m = unit === "min" ? 60_000 : unit === "hour" ? 3_600_000 : 86_400_000;
  return amount * m;
}

function contactVars(contact: Contact): Record<string, string> {
  return {
    name: contact.name ?? "there",
    first_name: (contact.name ?? "there").split(" ")[0],
    phone: contact.phone,
    email: contact.email ?? "",
    stage: contact.stage,
  };
}

/** Gather the live exit context for a contact. */
async function exitContextFor(contactId: string) {
  const [contact, paidDeals, optOuts] = await Promise.all([
    prisma.contact.findUnique({ where: { id: contactId } }),
    prisma.deal.findMany({
      where: { contactId, status: "paid" },
      select: { tier: true },
    }),
    prisma.consent.findMany({
      where: { contactId, optedIn: false },
      select: { channel: true },
    }),
  ]);
  return {
    stage: contact?.stage ?? "lead",
    paidTiers: paidDeals.map((d) => d.tier as string),
    optedOutChannels: optOuts.map((c) => c.channel as string),
  };
}

/**
 * Enroll a contact into a sequence (idempotent on [sequenceId, contactId]).
 * Skips if the contact already meets the sequence's exit conditions.
 */
export async function enrollContact(params: {
  sequenceId: string;
  contactId: string;
}): Promise<Enrollment | null> {
  const { sequenceId, contactId } = params;
  const sequence = await prisma.sequence.findUnique({
    where: { id: sequenceId },
  });
  if (!sequence || sequence.status !== "active") return null;

  const existing = await prisma.enrollment.findUnique({
    where: { sequenceId_contactId: { sequenceId, contactId } },
  });
  if (existing) return existing;

  // Don't enroll someone who already meets exit conditions.
  const ctx = await exitContextFor(contactId);
  const exit = evaluateSequenceExit(
    sequence.exitConditions as ExitConditions | null,
    ctx
  );
  if (exit.exit) return null;

  const enrollment = await prisma.enrollment.create({
    data: {
      sequenceId,
      contactId,
      currentStep: 0,
      status: "active",
      nextRunAt: new Date(),
    },
  });
  await logActivity({
    contactId,
    type: "sequence_enrolled",
    channel: "system",
    summary: `Enrolled in sequence "${sequence.name}"`,
    meta: { sequenceId },
  });
  return enrollment;
}

/** Find active sequences matching a trigger + simple filter, and enroll. */
export async function autoEnroll(params: {
  triggerType: string;
  contactId: string;
  context?: Record<string, unknown>;
}): Promise<string[]> {
  const sequences = await prisma.sequence.findMany({
    where: { status: "active", triggerType: params.triggerType },
  });
  const enrolled: string[] = [];
  for (const seq of sequences) {
    if (!matchesFilter(seq.triggerFilter, params.context)) continue;
    const e = await enrollContact({
      sequenceId: seq.id,
      contactId: params.contactId,
    });
    if (e) enrolled.push(seq.id);
  }
  return enrolled;
}

/** Minimal filter matcher: every key in filter must equal the context value. */
function matchesFilter(
  filter: unknown,
  context?: Record<string, unknown>
): boolean {
  if (!filter || typeof filter !== "object") return true;
  const f = filter as Record<string, unknown>;
  const ctx = context ?? {};
  for (const [k, v] of Object.entries(f)) {
    if (k === "exit") continue;
    if (Array.isArray(v)) {
      if (!v.includes(ctx[k])) return false;
    } else if (ctx[k] !== v) {
      return false;
    }
  }
  return true;
}

// ----------------------- exit enforcement -----------------------

/**
 * Re-evaluate exit conditions for all of a contact's active enrollments and
 * exit any that now match. Call this on conversion / stage change / opt-out.
 */
export async function enforceExits(contactId: string, reasonHint?: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { contactId, status: "active" },
    include: { sequence: true },
  });
  if (!enrollments.length) return;
  const ctx = await exitContextFor(contactId);

  for (const e of enrollments) {
    const exit = evaluateSequenceExit(
      e.sequence.exitConditions as ExitConditions | null,
      ctx
    );
    if (exit.exit) {
      await prisma.enrollment.update({
        where: { id: e.id },
        data: {
          status: "exited",
          exitReason: exit.reason ?? reasonHint ?? "exit",
          nextRunAt: null,
        },
      });
      await logActivity({
        contactId,
        type: "sequence_exited",
        channel: "system",
        summary: `Exited "${e.sequence.name}" — ${exit.reason ?? reasonHint}`,
        meta: { sequenceId: e.sequenceId, reason: exit.reason },
      });
    }
  }
}

// ----------------------- step execution -----------------------

/**
 * Advance a single enrollment by executing steps until it must wait (delay),
 * exits, or completes. Safe to call repeatedly (idempotent per nextRunAt tick).
 */
export async function advanceEnrollment(enrollmentId: string): Promise<void> {
  const MAX_STEPS_PER_TICK = 20;
  for (let i = 0; i < MAX_STEPS_PER_TICK; i++) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        sequence: { include: { steps: { orderBy: { order: "asc" } } } },
        contact: true,
      },
    });
    if (!enrollment || enrollment.status !== "active") return;

    // Exit check before every step.
    const ctx = await exitContextFor(enrollment.contactId);
    const exit = evaluateSequenceExit(
      enrollment.sequence.exitConditions as ExitConditions | null,
      ctx
    );
    if (exit.exit) {
      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { status: "exited", exitReason: exit.reason, nextRunAt: null },
      });
      await logActivity({
        contactId: enrollment.contactId,
        type: "sequence_exited",
        channel: "system",
        summary: `Exited "${enrollment.sequence.name}" — ${exit.reason}`,
      });
      return;
    }

    const steps = enrollment.sequence.steps;
    if (enrollment.currentStep >= steps.length) {
      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { status: "completed", nextRunAt: null },
      });
      await logActivity({
        contactId: enrollment.contactId,
        type: "sequence_completed",
        channel: "system",
        summary: `Completed "${enrollment.sequence.name}"`,
      });
      return;
    }

    const step = steps[enrollment.currentStep];
    const vars = contactVars(enrollment.contact);

    if (step.type === "delay") {
      const ms = delayToMs(step.delayAmount ?? 0, step.delayUnit ?? "day");
      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          currentStep: enrollment.currentStep + 1,
          nextRunAt: new Date(Date.now() + ms),
        },
      });
      return; // wait until nextRunAt
    }

    if (step.type === "condition") {
      // conditionJson: { exitIf: "converted" | "opted_out" } -> exit; else continue.
      const cond = (step.conditionJson ?? {}) as { exitIf?: string };
      if (
        (cond.exitIf === "converted" && ctx.paidTiers.length > 0) ||
        (cond.exitIf === "opted_out" && ctx.optedOutChannels.length > 0)
      ) {
        await prisma.enrollment.update({
          where: { id: enrollmentId },
          data: { status: "exited", exitReason: cond.exitIf, nextRunAt: null },
        });
        return;
      }
      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { currentStep: enrollment.currentStep + 1 },
      });
      continue;
    }

    if (step.type === "task") {
      await prisma.task.create({
        data: {
          contactId: enrollment.contactId,
          assignedToId: enrollment.contact.assignedToId,
          title: renderTemplate(step.content ?? "Follow up", vars),
          notes: `Auto-created by sequence "${enrollment.sequence.name}"`,
          dueAt: new Date(Date.now() + 86_400_000),
        },
      });
      await logActivity({
        contactId: enrollment.contactId,
        type: "task_created",
        channel: "system",
        summary: `Task created by sequence: ${renderTemplate(step.content ?? "Follow up", vars)}`,
      });
      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { currentStep: enrollment.currentStep + 1 },
      });
      continue;
    }

    // Messaging step (email | whatsapp | sms).
    let body = step.content ?? "";
    let subject: string | undefined;
    let templateApproved = false;
    let templateName: string | undefined;
    if (step.templateId) {
      const tpl = await prisma.template.findUnique({
        where: { id: step.templateId },
      });
      if (tpl) {
        body = tpl.body;
        subject = tpl.subject ?? undefined;
        templateName = tpl.name;
        templateApproved = tpl.whatsappApprovalStatus === "approved";
      }
    }
    body = renderTemplate(body, vars);
    subject = subject ? renderTemplate(subject, vars) : undefined;

    await sendMessage({
      contactId: enrollment.contactId,
      channel: step.type,
      category: "marketing",
      body,
      subject,
      templateId: step.templateId,
      templateName,
      templateApproved,
    });

    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { currentStep: enrollment.currentStep + 1, nextRunAt: new Date() },
    });
    // Continue to the next step immediately (loop) until a delay/exit/complete.
  }
}

/** Process all enrollments whose nextRunAt is due. Returns count advanced. */
export async function processDueEnrollments(limit = 100): Promise<number> {
  const due = await prisma.enrollment.findMany({
    where: { status: "active", nextRunAt: { lte: new Date() } },
    orderBy: { nextRunAt: "asc" },
    take: limit,
    select: { id: true },
  });
  for (const e of due) {
    await advanceEnrollment(e.id);
  }
  return due.length;
}
