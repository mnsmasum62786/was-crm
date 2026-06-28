import { WHATSAPP_WINDOW_HOURS } from "./constants";

export type WhatsappSendDecision = {
  /** Whether a send is permitted at all. */
  allowed: boolean;
  /** "freeform" inside the 24h window, "template" outside it. */
  mode: "freeform" | "template";
  /** True when the contact is currently inside the 24h customer-care window. */
  insideWindow: boolean;
  reason: string;
};

/**
 * Pure decision for the WhatsApp 24-hour window rule.
 *
 * Inside 24h of the last INBOUND message -> free-form text allowed.
 * Outside the window -> only Meta-approved templates may be sent.
 *
 * @param lastInboundAt timestamp of the contact's most recent inbound message (or null/undefined)
 * @param now           current time (defaults to Date.now via new Date())
 * @param hasApprovedTemplate whether the intended send uses an approved template
 */
export function decideWhatsappSend(params: {
  lastInboundAt: Date | string | null | undefined;
  now?: Date;
  hasApprovedTemplate: boolean;
}): WhatsappSendDecision {
  const { lastInboundAt, hasApprovedTemplate } = params;
  const now = params.now ?? new Date();

  const last = lastInboundAt ? new Date(lastInboundAt) : null;
  const insideWindow =
    last != null &&
    !Number.isNaN(last.getTime()) &&
    now.getTime() - last.getTime() <= WHATSAPP_WINDOW_HOURS * 60 * 60 * 1000 &&
    now.getTime() - last.getTime() >= 0;

  if (insideWindow) {
    return {
      allowed: true,
      mode: "freeform",
      insideWindow: true,
      reason: "Inside 24h customer-care window — free-form allowed.",
    };
  }

  // Outside the window: only approved templates.
  if (hasApprovedTemplate) {
    return {
      allowed: true,
      mode: "template",
      insideWindow: false,
      reason: "Outside window — approved template send allowed.",
    };
  }

  return {
    allowed: false,
    mode: "template",
    insideWindow: false,
    reason:
      "Outside 24h window and no approved template — free-form send blocked.",
  };
}
