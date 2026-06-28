"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getCurrentUser } from "./rbac";
import { upsertContactByPhone, setStage } from "./contacts";
import { processDeal } from "./deals";
import { enrollContact, autoEnroll } from "./sequences";
import { kickEnrollments } from "./inngest/trigger";
import { sendMessage } from "./messaging";
import { optOut } from "./consent";
import { writeAudit } from "./audit";
import { logActivity } from "./activity";
import type {
  Channel,
  DealStatus,
  DealTier,
  Segment,
  Stage,
  StepType,
  DelayUnit,
  TemplateCategory,
} from "@prisma/client";

async function uid() {
  const u = await getCurrentUser();
  return u?.id ?? null;
}

// --------------------------- contacts ---------------------------

export async function createContactAction(form: FormData) {
  const { contact } = await upsertContactByPhone({
    phone: String(form.get("phone") ?? ""),
    name: (form.get("name") as string) || null,
    email: (form.get("email") as string) || null,
    segment: ((form.get("segment") as string) || null) as Segment | null,
    source: (form.get("source") as string) || "manual",
  });
  const enrolled = await autoEnroll({
    triggerType: "lead_created",
    contactId: contact.id,
    context: { source: "manual" },
  });
  await kickEnrollments(enrolled);
  revalidatePath("/contacts");
}

export async function changeStageAction(contactId: string, stageInput: string) {
  const stage = stageInput as Stage;
  await setStage({ contactId, stage, userId: await uid(), reason: "manual" });
  // Conversions may trigger exits / next sequences.
  const enrolled = await autoEnroll({
    triggerType: "stage_changed",
    contactId,
    context: { stage },
  });
  await kickEnrollments(enrolled);
  revalidatePath("/pipeline");
  revalidatePath(`/contacts/${contactId}`);
}

export async function assignContactAction(contactId: string, userId: string | null) {
  const before = await prisma.contact.findUnique({ where: { id: contactId } });
  await prisma.contact.update({
    where: { id: contactId },
    data: { assignedToId: userId },
  });
  await writeAudit({
    userId: await uid(),
    action: "contact.assigned",
    entity: "Contact",
    entityId: contactId,
    before: { assignedToId: before?.assignedToId },
    after: { assignedToId: userId },
  });
  revalidatePath(`/contacts/${contactId}`);
}

export async function optOutAction(contactId: string, channel: Channel | "all") {
  await optOut({ contactId, channel, source: "manual_admin" });
  revalidatePath(`/contacts/${contactId}`);
}

export async function addNoteAction(contactId: string, form: FormData) {
  const note = String(form.get("note") ?? "").trim();
  if (!note) return;
  await logActivity({
    contactId,
    type: "note",
    channel: "system",
    summary: note,
  });
  revalidatePath(`/contacts/${contactId}`);
}

// --------------------------- deals ---------------------------

export async function createDealAction(form: FormData) {
  const contactId = String(form.get("contactId"));
  await processDeal({
    contactId,
    tier: String(form.get("tier")) as DealTier,
    amount: Number(form.get("amount") ?? 0),
    status: String(form.get("status") ?? "paid") as DealStatus,
    lostReason: (form.get("lostReason") as string) || null,
    userId: await uid(),
  });
  revalidatePath("/deals");
  revalidatePath(`/contacts/${contactId}`);
}

// --------------------------- tasks ---------------------------

export async function createTaskAction(form: FormData) {
  const dueAtRaw = form.get("dueAt") as string;
  await prisma.task.create({
    data: {
      title: String(form.get("title")),
      notes: (form.get("notes") as string) || null,
      contactId: (form.get("contactId") as string) || null,
      assignedToId: (form.get("assignedToId") as string) || (await uid()),
      dueAt: dueAtRaw ? new Date(dueAtRaw) : null,
    },
  });
  revalidatePath("/tasks");
}

export async function toggleTaskAction(taskId: string) {
  const t = await prisma.task.findUnique({ where: { id: taskId } });
  if (!t) return;
  await prisma.task.update({
    where: { id: taskId },
    data: { status: t.status === "open" ? "done" : "open" },
  });
  revalidatePath("/tasks");
}

// --------------------------- batches ---------------------------

export async function createBatchAction(form: FormData) {
  await prisma.batch.create({
    data: {
      name: String(form.get("name")),
      workshopDate: new Date(String(form.get("workshopDate"))),
    },
  });
  revalidatePath("/batches");
}

export async function markAttendanceAction(
  registrationId: string,
  field: "attendedDay1" | "attendedDay3",
  value: boolean
) {
  const reg = await prisma.registration.update({
    where: { id: registrationId },
    data: { [field]: value },
  });
  // Day3 attendance advances stage + triggers follow-up sales sequence.
  if (field === "attendedDay3" && value) {
    await setStage({
      contactId: reg.contactId,
      stage: "workshop_attended",
      userId: await uid(),
      reason: "attended day 3",
    });
    const enrolled = await autoEnroll({
      triggerType: "stage_changed",
      contactId: reg.contactId,
      context: { stage: "workshop_attended" },
    });
    await kickEnrollments(enrolled);
  }
  revalidatePath("/batches");
}

// --------------------------- templates ---------------------------

export async function createTemplateAction(form: FormData) {
  await prisma.template.create({
    data: {
      name: String(form.get("name")),
      channel: String(form.get("channel")) as Channel,
      category: String(form.get("category") ?? "marketing") as TemplateCategory,
      subject: (form.get("subject") as string) || null,
      body: String(form.get("body")),
      whatsappApprovalStatus:
        (form.get("channel") as string) === "whatsapp" ? "approved" : "none",
    },
  });
  revalidatePath("/templates");
}

// --------------------------- sequences ---------------------------

export async function createSequenceAction(form: FormData) {
  await prisma.sequence.create({
    data: {
      name: String(form.get("name")),
      triggerType: String(form.get("triggerType")),
      exitConditions: { converted: true, optedOut: true },
    },
  });
  revalidatePath("/sequences");
}

export async function toggleSequenceAction(sequenceId: string) {
  const s = await prisma.sequence.findUnique({ where: { id: sequenceId } });
  if (!s) return;
  await prisma.sequence.update({
    where: { id: sequenceId },
    data: { status: s.status === "active" ? "paused" : "active" },
  });
  revalidatePath("/sequences");
  revalidatePath(`/sequences/${sequenceId}`);
}

export async function addStepAction(form: FormData) {
  const sequenceId = String(form.get("sequenceId"));
  const count = await prisma.sequenceStep.count({ where: { sequenceId } });
  const type = String(form.get("type")) as StepType;
  await prisma.sequenceStep.create({
    data: {
      sequenceId,
      order: count,
      type,
      delayAmount: type === "delay" ? Number(form.get("delayAmount") ?? 1) : null,
      delayUnit: type === "delay" ? (String(form.get("delayUnit") ?? "day") as DelayUnit) : null,
      templateId: (form.get("templateId") as string) || null,
      content: (form.get("content") as string) || null,
    },
  });
  revalidatePath(`/sequences/${sequenceId}`);
}

export async function deleteStepAction(stepId: string, sequenceId: string) {
  await prisma.sequenceStep.delete({ where: { id: stepId } });
  // Re-pack order.
  const steps = await prisma.sequenceStep.findMany({
    where: { sequenceId },
    orderBy: { order: "asc" },
  });
  await Promise.all(
    steps.map((s, i) =>
      prisma.sequenceStep.update({ where: { id: s.id }, data: { order: i } })
    )
  );
  revalidatePath(`/sequences/${sequenceId}`);
}

export async function enrollManualAction(sequenceId: string, contactId: string) {
  const e = await enrollContact({ sequenceId, contactId });
  if (e) await kickEnrollments([e.id]);
  revalidatePath(`/sequences/${sequenceId}`);
  revalidatePath(`/contacts/${contactId}`);
}

export async function testSendStepAction(stepId: string, contactId: string) {
  const step = await prisma.sequenceStep.findUnique({
    where: { id: stepId },
    include: { template: true },
  });
  if (!step || step.type === "delay" || step.type === "condition" || step.type === "task") {
    return;
  }
  await sendMessage({
    contactId,
    channel: step.type,
    category: "marketing",
    body: step.template?.body ?? step.content ?? "(test)",
    subject: step.template?.subject ?? "Test",
    templateId: step.templateId,
    templateName: step.template?.name,
    templateApproved: step.template?.whatsappApprovalStatus === "approved",
  });
  revalidatePath(`/contacts/${contactId}`);
}

// --------------------------- broadcasts ---------------------------

export async function sendBroadcastAction(form: FormData) {
  const channel = String(form.get("channel")) as Channel;
  const stage = (form.get("stage") as string) || "";
  const segment = (form.get("segment") as string) || "";
  const templateId = (form.get("templateId") as string) || null;
  const inlineBody = (form.get("body") as string) || "";
  const subject = (form.get("subject") as string) || "WAS";

  const template = templateId
    ? await prisma.template.findUnique({ where: { id: templateId } })
    : null;

  const where: Record<string, unknown> = {};
  if (stage) where.stage = stage as Stage;
  if (segment) where.segment = segment as Segment;

  const audience = await prisma.contact.findMany({ where, select: { id: true } });

  const campaign = await prisma.campaign.create({
    data: {
      name: String(form.get("name") || "Broadcast"),
      channel,
      audienceFilter: { stage: stage || null, segment: segment || null },
      templateId,
      status: "sending",
    },
  });

  let sent = 0;
  let blocked = 0;
  for (const c of audience) {
    const res = await sendMessage({
      contactId: c.id,
      channel,
      category: template?.category ?? "marketing",
      body: template?.body ?? inlineBody,
      subject: template?.subject ?? subject,
      templateId,
      templateName: template?.name,
      templateApproved: template?.whatsappApprovalStatus === "approved",
    });
    if (res.blocked) blocked++;
    else if (res.ok) sent++;
  }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      status: "sent",
      stats: { audience: audience.length, sent, blocked },
    },
  });
  revalidatePath("/broadcasts");
}

export async function runSequenceTickAction() {
  const { processDueEnrollments } = await import("./sequences");
  const n = await processDueEnrollments(300);
  revalidatePath("/sequences");
  return n;
}
