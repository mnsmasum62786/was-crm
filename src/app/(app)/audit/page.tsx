import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { user: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader title="Audit log" description="Every money & stage change is recorded" />
      <div className="p-6">
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>When</TH>
                  <TH>Actor</TH>
                  <TH>Action</TH>
                  <TH>Entity</TH>
                  <TH>Before → After</TH>
                </TR>
              </THead>
              <TBody>
                {logs.map((l) => (
                  <TR key={l.id}>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(l.createdAt)}
                    </TD>
                    <TD className="text-sm">{l.user?.name ?? "system"}</TD>
                    <TD className="font-mono text-xs">{l.action}</TD>
                    <TD className="text-xs">{l.entity}:{l.entityId.slice(0, 8)}</TD>
                    <TD className="font-mono text-xs text-muted-foreground">
                      {JSON.stringify(l.before)} → {JSON.stringify(l.after)}
                    </TD>
                  </TR>
                ))}
                {logs.length === 0 && (
                  <TR>
                    <TD colSpan={5} className="py-8 text-center text-muted-foreground">No audit entries.</TD>
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
