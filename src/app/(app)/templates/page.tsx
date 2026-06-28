import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTemplateAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await prisma.template.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader title="Templates" description="Email / WhatsApp / SMS message templates" />
      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t.name}</span>
                  <div className="flex gap-1.5">
                    <Badge tone="blue">{t.channel}</Badge>
                    <Badge tone="gray">{t.category}</Badge>
                    {t.channel === "whatsapp" && (
                      <Badge tone={t.whatsappApprovalStatus === "approved" ? "green" : "amber"}>
                        {t.whatsappApprovalStatus}
                      </Badge>
                    )}
                  </div>
                </div>
                {t.subject && <div className="mt-1 text-sm font-medium">{t.subject}</div>}
                <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader><CardTitle>New template</CardTitle></CardHeader>
          <CardContent>
            <form action={createTemplateAction} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input name="name" required placeholder="wa_my_template" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select name="channel" defaultValue="whatsapp">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </Select>
                <Select name="category" defaultValue="marketing">
                  <option value="utility">Utility</option>
                  <option value="marketing">Marketing</option>
                  <option value="transactional">Transactional</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Subject (email)</Label>
                <Input name="subject" />
              </div>
              <div className="space-y-1.5">
                <Label>Body</Label>
                <Textarea name="body" rows={4} required placeholder="Hi {{first_name}}…" />
              </div>
              <Button type="submit" className="w-full">Create template</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
