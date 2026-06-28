import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory fake of the unique-constrained IdempotencyKey table.
const seen = new Set<string>();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    idempotencyKey: {
      create: vi.fn(async ({ data }: { data: { key: string } }) => {
        if (seen.has(data.key)) {
          const err = new Error("Unique constraint failed") as Error & { code: string };
          err.code = "P2002";
          throw err;
        }
        seen.add(data.key);
        return { id: "x", ...data };
      }),
    },
  },
}));

import { claimIdempotencyKey, withIdempotency } from "@/lib/idempotency";

beforeEach(() => seen.clear());

describe("webhook idempotency", () => {
  it("claims a key once; replays are rejected", async () => {
    expect(await claimIdempotencyKey("txn-1", "payment")).toBe(true);
    expect(await claimIdempotencyKey("txn-1", "payment")).toBe(false);
    expect(await claimIdempotencyKey("txn-2", "payment")).toBe(true);
  });

  it("withIdempotency runs the body exactly once for a key", async () => {
    const fn = vi.fn(async () => "done");
    const a = await withIdempotency("k", "scope", fn);
    const b = await withIdempotency("k", "scope", fn);
    expect(a.processed).toBe(true);
    expect(a.result).toBe("done");
    expect(b.processed).toBe(false);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
