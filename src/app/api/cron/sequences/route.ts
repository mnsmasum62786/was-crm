import { NextRequest, NextResponse } from "next/server";
import { processDueEnrollments } from "@/lib/sequences";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Fallback sequence tick — processes every due enrollment. Wired to Vercel Cron
 * (see vercel.json) so durable delays advance even without a live Inngest setup.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }
  const processed = await processDueEnrollments(300);
  return NextResponse.json({ ok: true, processed });
}

export const POST = GET;
