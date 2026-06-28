import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ActionButton } from "@/components/interactive";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { markAttendanceAction, registerContactToBatchAction } from "@/lib/actions";
import { formatDate, formatBDT } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BatchDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      registrations: {
        include: { contact: { include: { deals: true } } },
        orderBy: { registeredAt: "asc" },
      },
    },
  });
  if (!batch) notFound();

  const total = batch.registrations.length;
  const attended = batch.registrations.filter((r) => r.attendedDay3).length;
  const conversions = batch.registrations.filter((r) =>
    r.contact.deals.some((d) => d.tier === "base" && d.status === "paid")
  ).length;
  const revenue = batch.registrations
    .flatMap((r) => r.contact.deals)
    .filter((d) => d.status === "paid")
    .reduce((s, d) => s + d.amount, 0);
  const showRate = total > 0 ? Math.round((attended / total) * 100) : 0;

  return (
    <div>
      <PageHeader title={batch.name} description={`${formatDate(batch.workshopDate)} · ${batch.status}`} />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat label="Registered" value={String(total)} />
          <Stat label="Attended (Day 3)" value={`${attended} · ${showRate}%`} />
          <Stat label="Base conversions" value={String(conversions)} />
          <Stat label="Revenue" value={formatBDT(revenue)} />
        </div>

        <Card>
          <CardContent className="p-4">
            <form
              action={registerContactToBatchAction}
              className="flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="batchId" value={batch.id} />
              <div className="flex-1 min-w-[160px]">
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <Input name="phone" required placeholder="01712345678" />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <Input name="name" placeholder="Full name" />
              </div>
              <Button type="submit">Register contact</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Contact</TH>
                  <TH>Phone</TH>
                  <TH>Day 1</TH>
                  <TH>Day 3</TH>
                  <TH>Converted</TH>
                </TR>
              </THead>
              <TBody>
                {batch.registrations.map((r) => {
                  const converted = r.contact.deals.some(
                    (d) => d.tier === "base" && d.status === "paid"
                  );
                  return (
                    <TR key={r.id}>
                      <TD>
                        <Link href={`/contacts/${r.contact.id}`} className="text-primary hover:underline">
                          {r.contact.name ?? "Unnamed"}
                        </Link>
                      </TD>
                      <TD className="font-mono text-xs">{r.contact.phone}</TD>
                      <TD>
                        <ActionButton
                          onAction={() => markAttendanceAction(r.id, "attendedDay1", !r.attendedDay1)}
                          variant={r.attendedDay1 ? "default" : "outline"}
                        >
                          {r.attendedDay1 ? "Present" : "Mark"}
                        </ActionButton>
                      </TD>
                      <TD>
                        <ActionButton
                          onAction={() => markAttendanceAction(r.id, "attendedDay3", !r.attendedDay3)}
                          variant={r.attendedDay3 ? "default" : "outline"}
                        >
                          {r.attendedDay3 ? "Present" : "Mark"}
                        </ActionButton>
                      </TD>
                      <TD>{converted ? "✅" : "—"}</TD>
                    </TR>
                  );
                })}
                {total === 0 && (
                  <TR>
                    <TD colSpan={5} className="py-8 text-center text-muted-foreground">
                      No registrations.
                    </TD>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
