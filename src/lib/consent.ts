import { prisma } from "./prisma";
import { logActivity } from "./activity";
import type { Channel } from "@prisma/client";
import { CHANNELS } from "./constants";

export async function getConsents(contactId: string) {
  return prisma.consent.findMany({ where: { contactId } });
}

/** Upsert a single channel's consent state. */
export async function setConsent(params: {
  contactId: string;
  channel: Channel;
  optedIn: boolean;
  source?: string;
}) {
  const { contactId, channel, optedIn, source } = params;
  return prisma.consent.upsert({
    where: { contactId_channel: { contactId, channel } },
    create: {
      contactId,
      channel,
      optedIn,
      source,
      optedOutAt: optedIn ? null : new Date(),
    },
    update: {
      optedIn,
      source,
      optedOutAt: optedIn ? null : new Date(),
    },
  });
}

/** Default a contact to opted-in on all channels (handed over their number). */
export async function seedDefaultConsent(contactId: string, source?: string) {
  await Promise.all(
    CHANNELS.map((channel) =>
      prisma.consent.upsert({
        where: { contactId_channel: { contactId, channel } },
        create: { contactId, channel, optedIn: true, source },
        update: {},
      })
    )
  );
}

/**
 * Honor a STOP / unsubscribe instantly: opt out of one channel (or all), and
 * exit the contact from every active marketing enrollment.
 */
export async function optOut(params: {
  contactId: string;
  channel?: Channel | "all";
  source?: string;
}) {
  const { contactId, source } = params;
  const channels: Channel[] =
    !params.channel || params.channel === "all"
      ? (CHANNELS as unknown as Channel[])
      : [params.channel];

  for (const channel of channels) {
    await setConsent({ contactId, channel, optedIn: false, source });
  }

  // Exit active enrollments — never chase an opted-out contact.
  await prisma.enrollment.updateMany({
    where: { contactId, status: "active" },
    data: { status: "exited", exitReason: "opted_out", nextRunAt: null },
  });

  await logActivity({
    contactId,
    type: "opt_out",
    channel: channels.join(","),
    summary: `Opted out of ${channels.join(", ")} (${source ?? "manual"})`,
  });
}
