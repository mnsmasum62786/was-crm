import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { StageChanger } from "@/components/interactive";
import { STAGES, STAGE_LABELS } from "@/lib/constants";
import { changeStageAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const contacts = await prisma.contact.findMany({
    orderBy: { updatedAt: "desc" },
    take: 500,
    select: { id: true, name: true, phone: true, stage: true, segment: true },
  });

  const byStage: Record<string, typeof contacts> = {};
  for (const s of STAGES) byStage[s] = [];
  for (const c of contacts) byStage[c.stage]?.push(c);

  return (
    <div>
      <PageHeader title="Pipeline" description="Move contacts across funnel stages — every move is audited" />
      <div className="flex gap-4 overflow-x-auto p-6">
        {STAGES.map((stage) => (
          <div key={stage} className="w-72 shrink-0">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h3>
              <Badge tone="gray">{byStage[stage].length}</Badge>
            </div>
            <div className="space-y-2">
              {byStage[stage].map((c) => (
                <div key={c.id} className="rounded-lg border bg-card p-3 shadow-sm">
                  <Link
                    href={`/contacts/${c.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {c.name ?? "Unnamed"}
                  </Link>
                  <div className="font-mono text-xs text-muted-foreground">{c.phone}</div>
                  {c.segment && (
                    <Badge tone="blue" className="mt-1">{c.segment}</Badge>
                  )}
                  <div className="mt-2">
                    <StageChanger
                      contactId={c.id}
                      current={c.stage}
                      stages={STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }))}
                      action={changeStageAction}
                    />
                  </div>
                </div>
              ))}
              {byStage[stage].length === 0 && (
                <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                  Empty
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
