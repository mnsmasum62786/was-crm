import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { optOut } from "@/lib/consent";
import type { Channel } from "@prisma/client";

/** One-click unsubscribe for email/WhatsApp/SMS links (?c=<contactId>&ch=email). */
export async function GET(req: NextRequest) {
  const contactId = req.nextUrl.searchParams.get("c");
  const ch = req.nextUrl.searchParams.get("ch") as Channel | "all" | null;
  if (!contactId) {
    return new NextResponse("Missing contact", { status: 400 });
  }
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) return new NextResponse("Not found", { status: 404 });

  await optOut({
    contactId,
    channel: ch ?? "all",
    source: "unsubscribe_link",
  });

  return new NextResponse(
    `<html><body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center">
      <h2>You're unsubscribed</h2>
      <p>You will no longer receive ${ch && ch !== "all" ? ch : "marketing"} messages from WAS.</p>
     </body></html>`,
    { status: 200, headers: { "content-type": "text/html" } }
  );
}
