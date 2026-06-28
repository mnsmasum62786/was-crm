// WAS funnel constants — single source of truth for tiers, prices and stages.

export const TIERS = {
  workshop: {
    key: "workshop",
    label: "Web Analytics Launchpad (Workshop)",
    price: 499,
  },
  base: {
    key: "base",
    label: "Base Membership (1 year)",
    price: 5999,
    renewalPrice: 4999,
  },
  vip: {
    key: "vip",
    label: "VIP Membership (lifetime)",
    price: 12999,
  },
} as const;

export const RENEWAL_PRICE = 4999;

// Pipeline stages, in funnel order.
export const STAGES = [
  "lead",
  "workshop_registered",
  "workshop_attended",
  "base_member",
  "vip_member",
  "renewed",
  "churned",
] as const;
export type StageKey = (typeof STAGES)[number];

export const STAGE_LABELS: Record<StageKey, string> = {
  lead: "Lead",
  workshop_registered: "Workshop Registered",
  workshop_attended: "Workshop Attended",
  base_member: "Base Member",
  vip_member: "VIP Member",
  renewed: "Renewed",
  churned: "Churned",
};

export const SEGMENTS = ["beginner", "ad_expert", "web_dev"] as const;
export type SegmentKey = (typeof SEGMENTS)[number];

export const CHANNELS = ["email", "whatsapp", "sms"] as const;
export type ChannelKey = (typeof CHANNELS)[number];

export const ROLES = ["founder", "closer", "support"] as const;
export type RoleKey = (typeof ROLES)[number];

// WhatsApp free-form messaging window (Meta): 24 hours since last inbound.
export const WHATSAPP_WINDOW_HOURS = 24;

// Renewal alert offsets (days before expiry).
export const RENEWAL_ALERT_DAYS = [30, 15, 7];

export const SEQUENCE_TRIGGERS = [
  "lead_created",
  "stage_changed",
  "payment_status",
  "tag_added",
  "membership_expiring",
  "no_action_after_x",
  "manual_enroll",
] as const;
export type SequenceTrigger = (typeof SEQUENCE_TRIGGERS)[number];
