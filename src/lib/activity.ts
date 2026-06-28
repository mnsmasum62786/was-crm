import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

/** Append to a contact's unified activity timeline. */
export async function logActivity(params: {
  contactId: string;
  type: string;
  channel?: string | null;
  summary: string;
  meta?: Prisma.InputJsonValue | null;
}) {
  return prisma.activity.create({
    data: {
      contactId: params.contactId,
      type: params.type,
      channel: params.channel ?? null,
      summary: params.summary,
      meta: params.meta ?? undefined,
    },
  });
}
