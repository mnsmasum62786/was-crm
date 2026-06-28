import { prisma } from "./prisma";
import { normalizePhone } from "./phone";
import { extractAttribution, attributionToUpdate } from "./attribution";
import { seedDefaultConsent } from "./consent";
import { logActivity } from "./activity";
import { writeAudit } from "./audit";
import type { Segment, Stage } from "@prisma/client";

export class InvalidPhoneError extends Error {
  constructor(input: string) {
    super(`Invalid phone number: ${input}`);
    this.name = "InvalidPhoneError";
  }
}

/** Map an inbound source to an initial pipeline stage. */
export function stageFromSource(source?: string | null): Stage {
  switch ((source ?? "").toLowerCase()) {
    case "workshop_registration":
    case "workshop":
    case "registration":
      return "workshop_registered";
    default:
      return "lead";
  }
}

export type UpsertContactInput = {
  phone: string;
  name?: string | null;
  email?: string | null;
  fbProfileUrl?: string | null;
  segment?: Segment | null;
  source?: string | null;
  /** Raw payload to extract attribution from (form fields / query). */
  attributionPayload?: Record<string, unknown> | null;
  /** Explicit stage override; otherwise derived from source for new contacts. */
  stage?: Stage | null;
  assignedToId?: string | null;
};

export type UpsertContactResult = {
  contact: Awaited<ReturnType<typeof prisma.contact.findUniqueOrThrow>>;
  isNew: boolean;
};

/**
 * Phone is the primary identity. Normalize to E.164 and dedupe on every ingest:
 *   - existing contact -> non-destructive update + a logged touch (never a dup)
 *   - new contact      -> create, seed consent, log lead_created, audit
 */
export async function upsertContactByPhone(
  input: UpsertContactInput
): Promise<UpsertContactResult> {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new InvalidPhoneError(input.phone);

  const attribution = extractAttribution(input.attributionPayload ?? null);
  const attrUpdate = attributionToUpdate(attribution);

  const existing = await prisma.contact.findUnique({ where: { phone } });

  if (existing) {
    // Non-destructive: only fill blanks for name/email/etc., merge attribution.
    const data: Record<string, unknown> = { ...attrUpdate };
    if (!existing.name && input.name) data.name = input.name;
    if (!existing.email && input.email) data.email = input.email;
    if (!existing.fbProfileUrl && input.fbProfileUrl)
      data.fbProfileUrl = input.fbProfileUrl;
    if (!existing.segment && input.segment) data.segment = input.segment;
    if (!existing.source && input.source) data.source = input.source;
    if (input.stage) data.stage = input.stage;
    if (input.assignedToId && !existing.assignedToId)
      data.assignedToId = input.assignedToId;

    const contact = await prisma.contact.update({
      where: { id: existing.id },
      data,
    });

    await logActivity({
      contactId: contact.id,
      type: "lead_touch",
      channel: "system",
      summary: `Re-ingested via ${input.source ?? "unknown source"} (deduped by phone)`,
      meta: { source: input.source ?? null, attribution },
    });

    return { contact, isNew: false };
  }

  const stage = input.stage ?? stageFromSource(input.source);
  const contact = await prisma.contact.create({
    data: {
      phone,
      name: input.name ?? null,
      email: input.email ?? null,
      fbProfileUrl: input.fbProfileUrl ?? null,
      segment: input.segment ?? null,
      source: input.source ?? null,
      stage,
      assignedToId: input.assignedToId ?? null,
      ...attrUpdate,
    },
  });

  await seedDefaultConsent(contact.id, input.source ?? "ingest");
  await logActivity({
    contactId: contact.id,
    type: "lead_created",
    channel: "system",
    summary: `Lead created via ${input.source ?? "unknown source"}`,
    meta: { source: input.source ?? null, attribution, stage },
  });
  await writeAudit({
    action: "contact.create",
    entity: "Contact",
    entityId: contact.id,
    after: { phone, stage, source: input.source ?? null },
  });

  return { contact, isNew: true };
}

/** Change a contact's stage with audit + activity (single funnel mover). */
export async function setStage(params: {
  contactId: string;
  stage: Stage;
  userId?: string | null;
  reason?: string;
}) {
  const { contactId, stage, userId, reason } = params;
  const before = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!before || before.stage === stage) return before;

  const contact = await prisma.contact.update({
    where: { id: contactId },
    data: { stage },
  });

  await writeAudit({
    userId,
    action: "contact.stage_changed",
    entity: "Contact",
    entityId: contactId,
    before: { stage: before.stage },
    after: { stage, reason: reason ?? null },
  });
  await logActivity({
    contactId,
    type: "stage_changed",
    channel: "system",
    summary: `Stage ${before.stage} → ${stage}${reason ? ` (${reason})` : ""}`,
    meta: { from: before.stage, to: stage },
  });

  return contact;
}
