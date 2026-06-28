import { prisma } from "./prisma";

/**
 * Claim an idempotency key for a scope. Returns true if this is the FIRST time
 * the key is seen (caller should process), false if it's a replay (skip).
 *
 * Relies on the unique constraint on IdempotencyKey.key so concurrent gateway
 * retries can never both win.
 */
export async function claimIdempotencyKey(
  key: string,
  scope: string
): Promise<boolean> {
  try {
    await prisma.idempotencyKey.create({ data: { key, scope } });
    return true;
  } catch (e) {
    // Unique violation -> already processed.
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code?: string }).code === "P2002"
    ) {
      return false;
    }
    throw e;
  }
}

/**
 * Run `fn` at most once per idempotency key. On replay, returns
 * { processed: false }.
 */
export async function withIdempotency<T>(
  key: string,
  scope: string,
  fn: () => Promise<T>
): Promise<{ processed: boolean; result?: T }> {
  const first = await claimIdempotencyKey(key, scope);
  if (!first) return { processed: false };
  const result = await fn();
  return { processed: true, result };
}
