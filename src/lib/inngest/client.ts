import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "was-crm",
  eventKey: process.env.INNGEST_EVENT_KEY || undefined,
});

export const inngestConfigured = Boolean(process.env.INNGEST_EVENT_KEY);
