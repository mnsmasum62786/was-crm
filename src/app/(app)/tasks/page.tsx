import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/interactive";
import { createTaskAction, toggleTaskAction } from "@/lib/actions";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const tasks = await prisma.task.findMany({
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    take: 200,
    include: {
      contact: { select: { id: true, name: true, phone: true } },
      assignedTo: { select: { name: true } },
    },
  });
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <div>
      <PageHeader title="Tasks" description={`${open.length} open · ${done.length} done`} />
      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {tasks.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className={t.status === "done" ? "line-through text-muted-foreground" : "font-medium"}>
                    {t.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.contact && (
                      <Link href={`/contacts/${t.contact.id}`} className="text-primary hover:underline">
                        {t.contact.name ?? t.contact.phone}
                      </Link>
                    )}
                    {t.assignedTo && ` · ${t.assignedTo.name}`}
                    {t.dueAt && ` · due ${formatDateTime(t.dueAt)}`}
                  </div>
                </div>
                <ActionButton
                  onAction={() => toggleTaskAction(t.id)}
                  variant={t.status === "done" ? "ghost" : "default"}
                >
                  {t.status === "done" ? "Reopen" : "Done"}
                </ActionButton>
              </CardContent>
            </Card>
          ))}
          {tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks.</p>}
        </div>
        <Card>
          <CardHeader><CardTitle>New task</CardTitle></CardHeader>
          <CardContent>
            <form action={createTaskAction} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input name="title" required />
              </div>
              <div className="space-y-1.5">
                <Label>Due</Label>
                <Input name="dueAt" type="datetime-local" />
              </div>
              <Button type="submit" className="w-full">Create task</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
