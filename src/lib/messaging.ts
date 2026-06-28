import { prisma } from "./prisma";
import {
  getEmailProvider,
  getWhatsAppProvider,
  getSmsProvider,
} from "./providers";
import { canSend } from "./consent-gate";
import { decideWhatsappSend } from "./whatsapp-window";
import { logActivity } from "./activity";
import type { Channel, MessageStatus, TemplateCategory } from "@prisma/client";

export type SendOutcome = {
  ok: boolean;
  messageId?: string;
  blocked?: boolean;
  reason?: string;
};

/**
 * Unified outbound send pipeline. Enforces (in order):
 *   1. consent gate (marketing/utility blocked if opted out)
 *   2. WhatsApp 24h window (free-form only inside; templates only outside)
 * Then dispatches to the channel provider and logs to Message.
 */
export async function sendMessage(params: {
  contactId: string;
  channel: Channel;
  category?: TemplateCategory;
  body: string;
  subject?: string;
  templateId?: string | null;
  templateName?: string | null;
  /** Whether the WhatsApp template (if any) is Meta-approved. */
  templateApproved?: boolean;
  templateVariables?: string[];
}): Promise<SendOutcome> {
  const {
    contactId,
    channel,
    body,
    subject,
    templateId,
    templateName,
    templateVariables,
  } = params;
  const category: TemplateCategory = params.category ?? "marketing";

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: { consents: true },
  });
  if (!contact) return { ok: false, reason: "contact not found" };

  // 1) Consent gate.
  const consentDecision = canSend({
    channel,
    category,
    consents: contact.consents.map((c) => ({
      channel: c.channel,
      optedIn: c.optedIn,
    })),
  });
  if (!consentDecision.allowed) {
    await logActivity({
      contactId,
      type: "send_blocked",
      channel,
      summary: `Blocked ${channel} send: ${consentDecision.reason}`,
    });
    return { ok: false, blocked: true, reason: consentDecision.reason };
  }

  let providerMessageId: string | undefined;
  let status: MessageStatus = "queued";
  let useTemplateSend = false;

  if (channel === "whatsapp") {
    // 2) 24h window.
    const lastInbound = await prisma.message.findFirst({
      where: { contactId, channel: "whatsapp", direction: "in" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const decision = decideWhatsappSend({
      lastInboundAt: lastInbound?.createdAt ?? null,
      hasApprovedTemplate: Boolean(templateName && params.templateApproved),
    });
    if (!decision.allowed) {
      await logActivity({
        contactId,
        type: "send_blocked",
        channel,
        summary: `Blocked WhatsApp send: ${decision.reason}`,
      });
      return { ok: false, blocked: true, reason: decision.reason };
    }
    useTemplateSend = decision.mode === "template";
  }

  // Dispatch.
  let result;
  if (channel === "email") {
    result = await getEmailProvider().send({
      to: contact.email ?? contact.phone,
      subject: subject ?? "WAS",
      html: body,
    });
  } else if (channel === "whatsapp") {
    const wa = getWhatsAppProvider();
    result = useTemplateSend
      ? await wa.sendTemplate({
          to: contact.phone,
          templateName: templateName ?? "",
          variables: templateVariables,
          body,
        })
      : await wa.sendText({ to: contact.phone, body });
  } else {
    result = await getSmsProvider().send({ to: contact.phone, body });
  }

  status = result.status === "sent" ? "sent" : "failed";

  const message = await prisma.message.create({
    data: {
      contactId,
      channel,
      direction: "out",
      templateId: templateId ?? null,
      body,
      status,
      providerMessageId: result.providerMessageId ?? null,
      meta: { provider: result.provider, error: result.error ?? null },
    },
  });
  providerMessageId = message.id;

  await logActivity({
    contactId,
    type: "message_sent",
    channel,
    summary: `${channel} ${status} via ${result.provider}${subject ? `: ${subject}` : ""}`,
    meta: { messageId: message.id, status },
  });

  return { ok: result.ok, messageId: providerMessageId, reason: result.error };
}

/** Record an inbound message (resets the WhatsApp 24h window for WA). */
export async function recordInboundMessage(params: {
  contactId: string;
  channel: Channel;
  body: string;
  providerMessageId?: string;
}) {
  const msg = await prisma.message.create({
    data: {
      contactId: params.contactId,
      channel: params.channel,
      direction: "in",
      body: params.body,
      status: "delivered",
      providerMessageId: params.providerMessageId ?? null,
    },
  });
  await logActivity({
    contactId: params.contactId,
    type: "message_received",
    channel: params.channel,
    summary: `Inbound ${params.channel}: ${params.body.slice(0, 120)}`,
  });
  return msg;
}
