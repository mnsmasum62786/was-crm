import { PrismaClient, Channel, StepType, DelayUnit, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const json = (v: unknown): Prisma.InputJsonValue =>
  (v ?? Prisma.JsonNull) as Prisma.InputJsonValue;

// ----------------------------- templates -----------------------------

type Tpl = {
  name: string;
  channel: Channel;
  category: "utility" | "marketing" | "transactional";
  subject?: string;
  body: string;
  approved?: boolean;
};

const TEMPLATES: Tpl[] = [
  // Workshop reminder
  { name: "wa_workshop_confirm", channel: "whatsapp", category: "utility", approved: true,
    body: "Hi {{first_name}}! ✅ Your seat for the Web Analytics Launchpad is confirmed. We'll share the join link before the session. — WAS" },
  { name: "email_workshop_confirm", channel: "email", category: "utility",
    subject: "You're in — Web Analytics Launchpad",
    body: "<p>Hi {{first_name}},</p><p>Your seat is confirmed for the 3-day Web Analytics Launchpad. See you there!</p>" },
  { name: "wa_workshop_daybefore", channel: "whatsapp", category: "utility", approved: true,
    body: "Reminder: your Web Analytics Launchpad starts tomorrow, {{first_name}}! Keep your laptop ready. 🚀" },
  { name: "wa_workshop_1h", channel: "whatsapp", category: "utility", approved: true,
    body: "Starting in 1 hour, {{first_name}}! Join link coming up. Don't miss it." },
  { name: "wa_workshop_start", channel: "whatsapp", category: "utility", approved: true,
    body: "We're live now, {{first_name}}! Join here: https://was.example/live" },

  // Workshop follow-up (sales)
  { name: "wa_followup_recap", channel: "whatsapp", category: "marketing", approved: true,
    body: "Great having you, {{first_name}}! 🎯 Recap + your special Base Membership offer (৳5999) — valid 48h only. Reply YES to grab it." },
  { name: "email_followup_breakdown", channel: "email", category: "marketing",
    subject: "What you can build now (full breakdown)",
    body: "<p>Hi {{first_name}},</p><p>Here's the full Base Membership breakdown and how members are getting their first analytics wins.</p>" },
  { name: "wa_objection", channel: "whatsapp", category: "marketing", approved: true,
    body: "{{first_name}}, common question: \"Is Base worth it if I'm a beginner?\" Short answer — yes. Here's why 👇" },
  { name: "wa_socialproof", channel: "whatsapp", category: "marketing", approved: true,
    body: "Real results from WAS members this month 📈 — want me to send your enrollment link, {{first_name}}?" },
  { name: "wa_lastcall", channel: "whatsapp", category: "marketing", approved: true,
    body: "⏳ Last call, {{first_name}} — your ৳5999 Base offer expires tonight. Shall I reserve your spot?" },

  // Registered-not-paid
  { name: "wa_nudge", channel: "whatsapp", category: "marketing", approved: true,
    body: "Hi {{first_name}}, noticed you didn't complete your registration. Need help? Reply here." },
  { name: "wa_reminder", channel: "whatsapp", category: "marketing", approved: true,
    body: "{{first_name}}, your seat is still open. Complete payment to lock it in 🙌" },

  // Base onboarding
  { name: "email_base_welcome", channel: "email", category: "transactional",
    subject: "Welcome to WAS Base Membership 🎉",
    body: "<p>Welcome aboard, {{first_name}}! Here's how to get started with your Base Membership.</p>" },
  { name: "wa_base_day1", channel: "whatsapp", category: "utility", approved: true,
    body: "Day 1 quick win, {{first_name}}: set up your first GA4 report in 15 minutes. Guide inside the portal." },
  { name: "wa_base_day3", channel: "whatsapp", category: "utility", approved: true,
    body: "Day 3 check-in — how's it going, {{first_name}}? Any blockers we can help with?" },
  { name: "email_base_day7", channel: "email", category: "marketing",
    subject: "Got your first win yet?",
    body: "<p>{{first_name}}, a week in — did you get your first analytics win? Reply and tell us!</p>" },

  // VIP upsell
  { name: "wa_vip_upgrade", channel: "whatsapp", category: "marketing", approved: true,
    body: "{{first_name}}, you're active and crushing it 👏 Ready for lifetime VIP access? Upgrade benefits inside." },
  { name: "email_vip_benefits", channel: "email", category: "marketing",
    subject: "VIP — lifetime access & perks",
    body: "<p>Hi {{first_name}}, here's everything VIP unlocks for you, forever.</p>" },

  // Renewal
  { name: "wa_renewal_30", channel: "whatsapp", category: "utility", approved: true,
    body: "{{first_name}}, your WAS membership renews in 30 days. Renew early at ৳4999 and keep your access uninterrupted." },
  { name: "wa_renewal_15", channel: "whatsapp", category: "utility", approved: true,
    body: "15 days to renewal, {{first_name}}. Lock your ৳4999 renewal rate now." },
  { name: "wa_renewal_7", channel: "whatsapp", category: "utility", approved: true,
    body: "⏳ 7 days left, {{first_name}}! Renew today to avoid losing your member benefits." },

  // Cold re-engagement
  { name: "email_cold_value", channel: "email", category: "marketing",
    subject: "A free analytics resource for you",
    body: "<p>Hi {{first_name}}, it's been a while — here's a free resource to get you moving again.</p>" },
  { name: "wa_next_batch", channel: "whatsapp", category: "marketing", approved: true,
    body: "{{first_name}}, our next Launchpad batch is open. Want me to hold a seat for you?" },

  // Win-back
  { name: "wa_winback", channel: "whatsapp", category: "marketing", approved: true,
    body: "We miss you, {{first_name}}! Here's a comeback offer just for you — reply to claim." },
];

// ----------------------------- sequences -----------------------------

type Step =
  | { type: "email" | "whatsapp" | "sms"; template: string }
  | { type: "delay"; amount: number; unit: DelayUnit }
  | { type: "task"; content: string }
  | { type: "condition"; exitIf: string };

type Seq = {
  name: string;
  triggerType: string;
  triggerFilter?: Record<string, unknown>;
  exitConditions?: Record<string, unknown>;
  steps: Step[];
};

const SEQUENCES: Seq[] = [
  {
    name: "1. Workshop Reminder",
    triggerType: "stage_changed",
    triggerFilter: { stage: "workshop_registered" },
    exitConditions: { optedOut: true },
    steps: [
      { type: "whatsapp", template: "wa_workshop_confirm" },
      { type: "email", template: "email_workshop_confirm" },
      { type: "delay", amount: 1, unit: "day" },
      { type: "whatsapp", template: "wa_workshop_daybefore" },
      { type: "delay", amount: 23, unit: "hour" },
      { type: "whatsapp", template: "wa_workshop_1h" },
      { type: "delay", amount: 1, unit: "hour" },
      { type: "whatsapp", template: "wa_workshop_start" },
    ],
  },
  {
    name: "2. Workshop Follow-up (Sales)",
    triggerType: "stage_changed",
    triggerFilter: { stage: "workshop_attended" },
    exitConditions: { converted: ["base", "vip"], optedOut: true },
    steps: [
      { type: "delay", amount: 2, unit: "hour" },
      { type: "whatsapp", template: "wa_followup_recap" },
      { type: "delay", amount: 1, unit: "day" },
      { type: "email", template: "email_followup_breakdown" },
      { type: "delay", amount: 1, unit: "day" },
      { type: "whatsapp", template: "wa_objection" },
      { type: "delay", amount: 2, unit: "day" },
      { type: "task", content: "Send personal founder voice-note to {{first_name}}" },
      { type: "delay", amount: 1, unit: "day" },
      { type: "whatsapp", template: "wa_socialproof" },
      { type: "delay", amount: 1, unit: "day" },
      { type: "whatsapp", template: "wa_lastcall" },
    ],
  },
  {
    name: "3. Registered-Not-Paid",
    triggerType: "lead_created",
    triggerFilter: { source: "workshop_registration" },
    exitConditions: { converted: true, optedOut: true },
    steps: [
      { type: "delay", amount: 2, unit: "hour" },
      { type: "whatsapp", template: "wa_nudge" },
      { type: "delay", amount: 1, unit: "day" },
      { type: "whatsapp", template: "wa_reminder" },
    ],
  },
  {
    name: "4. Base Onboarding",
    triggerType: "payment_status",
    triggerFilter: { tier: "base" },
    exitConditions: { optedOut: true },
    steps: [
      { type: "email", template: "email_base_welcome" },
      { type: "delay", amount: 1, unit: "day" },
      { type: "whatsapp", template: "wa_base_day1" },
      { type: "delay", amount: 2, unit: "day" },
      { type: "whatsapp", template: "wa_base_day3" },
      { type: "delay", amount: 4, unit: "day" },
      { type: "email", template: "email_base_day7" },
    ],
  },
  {
    name: "5. VIP Upsell",
    triggerType: "tag_added",
    triggerFilter: { tag: "engaged_base" },
    exitConditions: { converted: ["vip"], optedOut: true },
    steps: [
      { type: "whatsapp", template: "wa_vip_upgrade" },
      { type: "delay", amount: 2, unit: "day" },
      { type: "email", template: "email_vip_benefits" },
    ],
  },
  {
    name: "6. Renewal",
    triggerType: "membership_expiring",
    exitConditions: { converted: ["renewal"], optedOut: true },
    steps: [
      { type: "whatsapp", template: "wa_renewal_30" },
      { type: "delay", amount: 15, unit: "day" },
      { type: "whatsapp", template: "wa_renewal_15" },
      { type: "delay", amount: 8, unit: "day" },
      { type: "whatsapp", template: "wa_renewal_7" },
      { type: "task", content: "Call at-risk member {{first_name}} about renewal" },
    ],
  },
  {
    name: "7. Cold Re-engagement",
    triggerType: "no_action_after_x",
    exitConditions: { converted: true, optedOut: true },
    steps: [
      { type: "email", template: "email_cold_value" },
      { type: "delay", amount: 3, unit: "day" },
      { type: "whatsapp", template: "wa_next_batch" },
    ],
  },
  {
    name: "8. Win-back",
    triggerType: "stage_changed",
    triggerFilter: { stage: "churned" },
    exitConditions: { converted: true, optedOut: true },
    steps: [{ type: "whatsapp", template: "wa_winback" }],
  },
];

async function main() {
  // Founder user.
  const email = (process.env.FOUNDER_EMAIL || "founder@example.com").toLowerCase();
  const password = process.env.FOUNDER_PASSWORD || "ChangeMe!123";
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: process.env.FOUNDER_NAME || "WAS Founder",
      passwordHash,
      role: "founder",
    },
    update: { passwordHash, role: "founder" },
  });
  console.log(`✔ Founder user: ${email}`);

  // Templates.
  const tplMap = new Map<string, string>();
  for (const t of TEMPLATES) {
    const tpl = await prisma.template.upsert({
      where: { name: t.name },
      create: {
        name: t.name,
        channel: t.channel,
        category: t.category,
        subject: t.subject ?? null,
        body: t.body,
        whatsappApprovalStatus: t.approved ? "approved" : "none",
      },
      update: { body: t.body, subject: t.subject ?? null },
    });
    tplMap.set(t.name, tpl.id);
  }
  console.log(`✔ ${TEMPLATES.length} templates`);

  // Sequences + steps.
  for (const s of SEQUENCES) {
    const seq = await prisma.sequence.upsert({
      where: { name: s.name },
      create: {
        name: s.name,
        triggerType: s.triggerType,
        triggerFilter: json(s.triggerFilter),
        exitConditions: json(s.exitConditions),
        status: "active",
      },
      update: {
        triggerType: s.triggerType,
        triggerFilter: json(s.triggerFilter),
        exitConditions: json(s.exitConditions),
      },
    });
    // Reset steps for idempotent reseed.
    await prisma.sequenceStep.deleteMany({ where: { sequenceId: seq.id } });
    await prisma.sequenceStep.createMany({
      data: s.steps.map((step, order) => ({
        sequenceId: seq.id,
        order,
        type: step.type as StepType,
        delayAmount: step.type === "delay" ? step.amount : null,
        delayUnit: step.type === "delay" ? step.unit : null,
        templateId:
          step.type === "email" || step.type === "whatsapp" || step.type === "sms"
            ? tplMap.get(step.template) ?? null
            : null,
        content: step.type === "task" ? step.content : null,
        conditionJson: step.type === "condition" ? { exitIf: step.exitIf } : undefined,
      })),
    });
  }
  console.log(`✔ ${SEQUENCES.length} sequences with steps`);

  // A demo batch.
  await prisma.batch.upsert({
    where: { id: "seed-batch-1" },
    create: {
      id: "seed-batch-1",
      name: "Launchpad — Batch 01",
      workshopDate: new Date(Date.now() + 14 * 86400000),
      status: "upcoming",
    },
    update: {},
  });
  console.log("✔ Demo batch");

  console.log("\n✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
