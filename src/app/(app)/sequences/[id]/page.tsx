import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/interactive";
import { addStepAction, deleteStepAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

const STEP_TONE: Record<string, "blue" | "green" | "amber" | "purple" | "gray"> = {
  email: "blue",
  whatsapp: "green",
  sms: "amber",
  task: "purple",
  delay: "gray",
  condition: "gray",
};

export default async function SequenceBuilder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sequence = await prisma.sequence.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { order: "asc" }, include: { template: true } },
      enrollments: { select: { status: true } },
    },
  });
  if (!sequence) notFound();

  const templates = await prisma.template.findMany({ orderBy: { name: "asc" } });
  const stats = {
    active: sequence.enrollments.filter((e) => e.status === "active").length,
    completed: sequence.enrollments.filter((e) => e.status === "completed").length,
    exited: sequence.enrollments.filter((e) => e.status === "exited").length,
  };
  const exit = sequence.exitConditions as Record<string, unknown> | null;

  return (
    <div>
      <PageHeader title={sequence.name} description={`Trigger: ${sequence.triggerType}`}>
        <Badge tone={sequence.status === "active" ? "green" : "amber"}>{sequence.status}</Badge>
      </PageHeader>

      <div className="grid gap-6 p-6 lg:grid-cols-3">
        {/* Steps */}
        <div className="space-y-3 lg:col-span-2">
          <div className="flex gap-2">
            <Badge tone="blue">{stats.active} active</Badge>
            <Badge tone="green">{stats.completed} completed</Badge>
            <Badge tone="gray">{stats.exited} exited</Badge>
          </div>

          {sequence.steps.map((step, i) => (
            <Card key={step.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {i + 1}
                  </span>
                  <div>
                    <Badge tone={STEP_TONE[step.type]}>{step.type}</Badge>
                    <div className="mt-1 text-sm">
                      {step.type === "delay"
                        ? `Wait ${step.delayAmount} ${step.delayUnit}`
                        : step.type === "task"
                        ? step.content
                        : step.type === "condition"
                        ? `If ${(step.conditionJson as { exitIf?: string })?.exitIf ?? "?"} → exit`
                        : step.template?.name ?? step.content ?? "—"}
                    </div>
                  </div>
                </div>
                <ActionButton
                  onAction={() => deleteStepAction(step.id, sequence.id)}
                  variant="ghost"
                >
                  Delete
                </ActionButton>
              </CardContent>
            </Card>
          ))}
          {sequence.steps.length === 0 && (
            <p className="text-sm text-muted-foreground">No steps yet — add one →</p>
          )}
        </div>

        {/* Add step + exit conditions */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Add step</CardTitle></CardHeader>
            <CardContent>
              <form action={addStepAction} className="space-y-3">
                <input type="hidden" name="sequenceId" value={sequence.id} />
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select name="type" defaultValue="whatsapp">
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="delay">Delay</option>
                    <option value="task">Task</option>
                    <option value="condition">Condition</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Template (for message steps)</Label>
                  <Select name="templateId" defaultValue="">
                    <option value="">— none —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        [{t.channel}] {t.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label>Delay amount</Label>
                    <Input name="delayAmount" type="number" defaultValue={1} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unit</Label>
                    <Select name="delayUnit" defaultValue="day">
                      <option value="min">min</option>
                      <option value="hour">hour</option>
                      <option value="day">day</option>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Inline content (task / fallback)</Label>
                  <Textarea name="content" rows={2} />
                </div>
                <Button type="submit" className="w-full">Add step</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Exit conditions</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Converted</span>
                <span>{JSON.stringify(exit?.converted ?? false)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Opted out</span>
                <span>{String(exit?.optedOut ?? false)}</span>
              </div>
              <p className="pt-2 text-xs text-muted-foreground">
                Contacts who convert or opt out exit this sequence automatically.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
