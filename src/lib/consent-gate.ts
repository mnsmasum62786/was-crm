// Pure consent gate. Consent + opt-out is enforced before every marketing send
// across email, WhatsApp and SMS. STOP/unsubscribe is honored instantly.

export type ConsentRecord = {
  channel: "email" | "whatsapp" | "sms";
  optedIn: boolean;
};

export type ConsentDecision = { allowed: boolean; reason: string };

/**
 * Decide whether a send is permitted for a channel + template category.
 *
 *  - transactional  -> always allowed (receipts, OTPs, payment confirmations)
 *  - utility / marketing -> blocked when the contact has explicitly opted out
 *    of that channel. Absence of a consent record is treated as implied consent
 *    (the contact handed over their number), but an explicit opt-out always wins.
 */
export function canSend(params: {
  channel: "email" | "whatsapp" | "sms";
  category: "utility" | "marketing" | "transactional";
  consents: ConsentRecord[];
}): ConsentDecision {
  const { channel, category, consents } = params;

  if (category === "transactional") {
    return { allowed: true, reason: "transactional — always allowed" };
  }

  const consent = consents.find((c) => c.channel === channel);
  if (consent && consent.optedIn === false) {
    return {
      allowed: false,
      reason: `contact opted out of ${channel}`,
    };
  }

  return { allowed: true, reason: "consent ok" };
}

/** Detect an inbound STOP / unsubscribe intent in a free-text body. */
export function isOptOutMessage(body: string | null | undefined): boolean {
  if (!body) return false;
  const normalized = body.trim().toLowerCase();
  return [
    "stop",
    "unsubscribe",
    "unsub",
    "opt out",
    "optout",
    "cancel",
    "remove me",
  ].some((kw) => normalized === kw || normalized.startsWith(kw + " "));
}
