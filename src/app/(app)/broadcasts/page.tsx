import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { STAGES, STAGE_LABELS, SEGMENTS } from "@/lib/constants";
import { sendBroadcastAction } from "@/lib/actions";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BroadcastsPage() {
  const [campaigns, templates] = await Promise.all([
    prisma.campaign.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.template.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Broadcasts" description="One-off campaigns to a filtered audience (consent + window enforced)" />
      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>New broadcast</CardTitle></CardHeader>
          <CardContent>
            <form action={sendBroadcastAction} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Campaign name</Label>
                <Input name="name" required defaultValue="Broadcast" />
              </div>
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <Select name="channel" defaultValue="whatsapp">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Stage</Label>
                  <Select name="stage" defaultValue="">
                    <option value="">All</option>
                    {STAGES.map((s) => (
                      <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Segment</Label>
                  <Select name="segment" defaultValue="">
                    <option value="">All</option>
                    {SEGMENTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Template (recommended for WhatsApp)</Label>
                <Select name="templateId" defaultValue="">
                  <option value="">— inline body —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>[{t.channel}] {t.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Inline body / subject</Label>
                <Input name="subject" placeholder="Subject (email)" />
                <Textarea name="body" rows={3} placeholder="Hi {{first_name}}…" />
              </div>
              <Button type="submit" className="w-full">Send broadcast</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3 lg:col-span-2">
          {campaigns.map((c) => {
            const stats = (c.stats as { audience?: number; sent?: number; blocked?: number }) ?? {};
            return (
              <Card key={c.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.channel} · {formatDateTime(c.createdAt)}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <Badge tone={c.status === "sent" ? "green" : "amber"}>{c.status}</Badge>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {stats.sent ?? 0} sent · {stats.blocked ?? 0} blocked · {stats.audience ?? 0} audience
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {campaigns.length === 0 && <p className="text-sm text-muted-foreground">No campaigns yet.</p>}
        </div>
      </div>
    </div>
  );
}
