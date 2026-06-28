import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, STAGE_TONE } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { STAGES, STAGE_LABELS, SEGMENTS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { Prisma, Stage, Segment } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string; segment?: string; source?: string }>;
}) {
  const sp = await searchParams;
  const where: Prisma.ContactWhereInput = {};
  if (sp.stage) where.stage = sp.stage as Stage;
  if (sp.segment) where.segment = sp.segment as Segment;
  if (sp.source) where.source = { contains: sp.source, mode: "insensitive" };
  if (sp.q) {
    where.OR = [
      { phone: { contains: sp.q } },
      { name: { contains: sp.q, mode: "insensitive" } },
      { email: { contains: sp.q, mode: "insensitive" } },
    ];
  }

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { assignedTo: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Contacts"
        description={`${contacts.length} shown · phone is primary identity`}
      />
      <div className="space-y-4 p-6">
        <Card>
          <CardContent className="p-4">
            <form className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <Input name="q" placeholder="Search phone, name, email…" defaultValue={sp.q} />
              </div>
              <Select name="stage" defaultValue={sp.stage ?? ""} className="w-44">
                <option value="">All stages</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </Select>
              <Select name="segment" defaultValue={sp.segment ?? ""} className="w-40">
                <option value="">All segments</option>
                {SEGMENTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
              <Button type="submit">Filter</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Phone</TH>
                  <TH>Stage</TH>
                  <TH>Segment</TH>
                  <TH>Source</TH>
                  <TH>Assigned</TH>
                  <TH>Created</TH>
                </TR>
              </THead>
              <TBody>
                {contacts.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <Link href={`/contacts/${c.id}`} className="font-medium text-primary hover:underline">
                        {c.name ?? "Unnamed"}
                      </Link>
                    </TD>
                    <TD className="font-mono text-xs">{c.phone}</TD>
                    <TD>
                      <Badge tone={STAGE_TONE[c.stage]}>{STAGE_LABELS[c.stage]}</Badge>
                    </TD>
                    <TD className="text-sm">{c.segment ?? "—"}</TD>
                    <TD className="text-sm text-muted-foreground">{c.source ?? "—"}</TD>
                    <TD className="text-sm">{c.assignedTo?.name ?? "—"}</TD>
                    <TD className="text-sm text-muted-foreground">{formatDate(c.createdAt)}</TD>
                  </TR>
                ))}
                {contacts.length === 0 && (
                  <TR>
                    <TD className="py-8 text-center text-muted-foreground" colSpan={7}>
                      No contacts found.
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
