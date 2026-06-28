import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

/** Write an audit-log entry. All money/stage changes must go through here. */
export async function writeAudit(params: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
}) {
  return prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      before: params.before ?? undefined,
      after: params.after ?? undefined,
    },
  });
}
