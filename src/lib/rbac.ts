import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import type { Role } from "@prisma/client";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

/** Role capability matrix. */
export const CAN = {
  manageUsers: (r: Role) => r === "founder",
  viewAllContacts: (r: Role) => r === "founder" || r === "support",
  editContacts: (r: Role) => r === "founder" || r === "closer",
  manageSequences: (r: Role) => r === "founder" || r === "closer",
  manageMoney: (r: Role) => r === "founder",
  viewDashboards: (_r: Role) => true,
  manageMembership: (r: Role) => r === "founder" || r === "support",
};

export function assertRole(role: Role, allowed: Role[]) {
  if (!allowed.includes(role)) throw new Error("FORBIDDEN");
}
