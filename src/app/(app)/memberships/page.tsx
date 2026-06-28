import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MembershipsPage() {
  const memberships = await prisma.membership.findMany({
    orderBy: { expiryDate: "asc" },
    include: { contact: { select: { id: true, name: true, phone: true } } },
  });

  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 86400000);
  const atRisk = memberships.filter(
    (m) => m.isActive && (m.engagement === "at_risk" || m.engagement === "ghost")
  );
  const expiringSoon = memberships.filter(
    (m) => m.isActive && m.expiryDate && m.expiryDate <= soon
  );

  return (
    <div>
      <PageHeader
        title="Memberships"
        description={`${memberships.length} total · ${atRisk.length} at-risk · ${expiringSoon.length} expiring ≤30d`}
      />
      <div className="p-6">
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Member</TH>
                  <TH>Tier</TH>
                  <TH>Start</TH>
                  <TH>Expiry</TH>
                  <TH>Engagement</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {memberships.map((m) => (
                  <TR key={m.id}>
                    <TD>
                      <Link href={`/contacts/${m.contact.id}`} className="text-primary hover:underline">
                        {m.contact.name ?? m.contact.phone}
                      </Link>
                    </TD>
                    <TD className="uppercase">{m.tier}</TD>
                    <TD className="text-sm">{formatDate(m.startDate)}</TD>
                    <TD className="text-sm">{m.tier === "vip" ? "Lifetime" : formatDate(m.expiryDate)}</TD>
                    <TD>
                      <Badge tone={m.engagement === "active" ? "green" : m.engagement === "at_risk" ? "red" : "amber"}>
                        {m.engagement}
                      </Badge>
                    </TD>
                    <TD>
                      <Badge tone={m.isActive ? "green" : "gray"}>
                        {m.isActive ? "active" : "inactive"}
                      </Badge>
                    </TD>
                  </TR>
                ))}
                {memberships.length === 0 && (
                  <TR>
                    <TD colSpan={6} className="py-8 text-center text-muted-foreground">No memberships.</TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
