import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatBDT, formatDate } from "@/lib/utils";
import { pipelineForecast } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const [deals, forecast] = await Promise.all([
    prisma.deal.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { contact: { select: { id: true, name: true, phone: true } } },
    }),
    pipelineForecast(),
  ]);

  const paid = deals.filter((d) => d.status === "paid").reduce((s, d) => s + d.amount, 0);
  const pending = deals
    .filter((d) => d.status === "pending" || d.status === "partial")
    .reduce((s, d) => s + d.amount, 0);

  return (
    <div>
      <PageHeader title="Deals" description="Payments, installments & forecast" />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Collected (paid)" value={formatBDT(paid)} />
          <Stat label="Open (pending/partial)" value={formatBDT(pending)} />
          <Stat
            label="Forecast (attended)"
            value={formatBDT(forecast.potentialBase)}
            sub={`${forecast.attendedNotConverted} not converted`}
          />
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Contact</TH>
                  <TH>Tier</TH>
                  <TH>Amount</TH>
                  <TH>Status</TH>
                  <TH>Lost reason</TH>
                  <TH>Date</TH>
                </TR>
              </THead>
              <TBody>
                {deals.map((d) => (
                  <TR key={d.id}>
                    <TD>
                      <Link href={`/contacts/${d.contact.id}`} className="text-primary hover:underline">
                        {d.contact.name ?? d.contact.phone}
                      </Link>
                    </TD>
                    <TD className="capitalize">{d.tier}</TD>
                    <TD>{formatBDT(d.amount)}</TD>
                    <TD>
                      <Badge tone={d.status === "paid" ? "green" : d.status === "failed" ? "red" : "amber"}>
                        {d.status}
                      </Badge>
                    </TD>
                    <TD className="text-sm text-muted-foreground">{d.lostReason ?? "—"}</TD>
                    <TD className="text-sm text-muted-foreground">{formatDate(d.paidAt ?? d.createdAt)}</TD>
                  </TR>
                ))}
                {deals.length === 0 && (
                  <TR>
                    <TD colSpan={6} className="py-8 text-center text-muted-foreground">No deals.</TD>
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

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
