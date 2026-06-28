import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { providerStatus } from "@/lib/providers";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const providers = providerStatus();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  const endpoints = [
    { method: "POST", path: "/api/ingest/lead", note: "Landing form / FB Lead Ads" },
    { method: "POST", path: "/api/ingest/payment", note: "bKash / aamarPay / SSLCommerz IPN" },
    { method: "POST", path: "/api/ingest/manychat", note: "ManyChat / WhatsApp flow" },
    { method: "GET/POST", path: "/api/webhooks/whatsapp", note: "WhatsApp Cloud webhook" },
    { method: "GET", path: "/api/cron/sequences", note: "Sequence tick (Vercel Cron)" },
    { method: "GET", path: "/api/cron/renewals", note: "Daily renewal scan" },
    { method: "ANY", path: "/api/inngest", note: "Inngest endpoint" },
  ];

  return (
    <div>
      <PageHeader title="Settings" description="Providers, team & integration endpoints" />
      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Channel providers</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.entries(providers).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="capitalize">{k}</span>
                <Badge tone={v === "mock" || v === "dev" ? "amber" : "green"}>{v}</Badge>
              </div>
            ))}
            <p className="pt-2 text-xs text-muted-foreground">
              Providers fall back to Mock automatically when API keys are absent. Add keys in
              the environment to activate the real provider.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Team</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between">
                <span>{u.name} <span className="text-muted-foreground">({u.email})</span></span>
                <Badge tone={u.role === "founder" ? "purple" : u.role === "closer" ? "blue" : "gray"}>
                  {u.role}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Integration endpoints</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {endpoints.map((e) => (
              <div key={e.path} className="flex items-center justify-between border-b py-1.5 last:border-0">
                <span className="font-mono text-xs">
                  <span className="text-primary">{e.method}</span> {e.path}
                </span>
                <span className="text-xs text-muted-foreground">{e.note}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
