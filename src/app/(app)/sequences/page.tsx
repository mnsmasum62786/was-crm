import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/interactive";
import { SEQUENCE_TRIGGERS } from "@/lib/constants";
import { createSequenceAction, toggleSequenceAction, runSequenceTickAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function SequencesPage() {
  const sequences = await prisma.sequence.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { steps: true, enrollments: true } },
      enrollments: { select: { status: true } },
    },
  });

  return (
    <div>
      <PageHeader title="Sequences" description="Automated multi-channel follow-up flows">
        <ActionButton onAction={runSequenceTickAction} variant="secondary">
          Run tick now
        </ActionButton>
      </PageHeader>
      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {sequences.map((s) => {
            const active = s.enrollments.filter((e) => e.status === "active").length;
            const completed = s.enrollments.filter((e) => e.status === "completed").length;
            const exited = s.enrollments.filter((e) => e.status === "exited").length;
            return (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <Link href={`/sequences/${s.id}`} className="font-medium text-primary hover:underline">
                      {s.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      trigger: {s.triggerType} · {s._count.steps} steps
                    </div>
                    <div className="mt-1 flex gap-2 text-xs">
                      <Badge tone="blue">{active} active</Badge>
                      <Badge tone="green">{completed} completed</Badge>
                      <Badge tone="gray">{exited} exited</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={s.status === "active" ? "green" : "amber"}>{s.status}</Badge>
                    <ActionButton onAction={() => toggleSequenceAction(s.id)}>
                      {s.status === "active" ? "Pause" : "Activate"}
                    </ActionButton>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader><CardTitle>New sequence</CardTitle></CardHeader>
          <CardContent>
            <form action={createSequenceAction} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input name="name" required />
              </div>
              <div className="space-y-1.5">
                <Label>Trigger</Label>
                <Select name="triggerType" defaultValue="lead_created">
                  {SEQUENCE_TRIGGERS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </div>
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
