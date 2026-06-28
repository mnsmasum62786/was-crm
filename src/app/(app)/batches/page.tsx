import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { createBatchAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function BatchesPage() {
  const batches = await prisma.batch.findMany({
    orderBy: { workshopDate: "desc" },
    include: { _count: { select: { registrations: true } } },
  });

  return (
    <div>
      <PageHeader title="Batches" description="Workshop batches & registrations" />
      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {batches.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <Link href={`/batches/${b.id}`} className="font-medium text-primary hover:underline">
                    {b.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(b.workshopDate)} · {b._count.registrations} registered
                  </div>
                </div>
                <Badge tone="blue">{b.status}</Badge>
              </CardContent>
            </Card>
          ))}
          {batches.length === 0 && <p className="text-sm text-muted-foreground">No batches yet.</p>}
        </div>
        <Card>
          <CardHeader><CardTitle>New batch</CardTitle></CardHeader>
          <CardContent>
            <form action={createBatchAction} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input name="name" required defaultValue="Launchpad — Batch" />
              </div>
              <div className="space-y-1.5">
                <Label>Workshop date</Label>
                <Input name="workshopDate" type="date" required />
              </div>
              <Button type="submit" className="w-full">Create batch</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
