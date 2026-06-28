import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  funnelMetrics,
  revenueMetrics,
  channelHealth,
  pipelineForecast,
  sourceMix,
  teamPerformance,
} from "@/lib/metrics";
import { providerStatus } from "@/lib/providers";
import { formatBDT } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [funnel, revenue, channels, forecast, mix, team] = await Promise.all([
    funnelMetrics(),
    revenueMetrics(),
    channelHealth(),
    pipelineForecast(),
    sourceMix(),
    teamPerformance(),
  ]);
  const providers = providerStatus();
  const maxStep = Math.max(...funnel.steps.map((s) => s.value), 1);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Funnel, revenue, channel health and team performance"
      />
      <div className="space-y-6 p-6">
        {/* Top stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total revenue" value={formatBDT(revenue.total)} />
          <Stat label="Paid deals" value={String(revenue.dealCount)} />
          <Stat
            label="Forecast (attended)"
            value={formatBDT(forecast.potentialBase)}
            sub={`${forecast.attendedNotConverted} not converted`}
          />
          <Stat
            label="Organic vs Paid"
            value={`${mix.organic} / ${mix.paid}`}
            sub="leads"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>Conversion funnel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {funnel.steps.map((s) => (
                <div key={s.key}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{s.label}</span>
                    <span className="text-muted-foreground">
                      {s.value} · {s.conv}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted">
                    <div
                      className="h-2.5 rounded-full bg-primary"
                      style={{ width: `${(s.value / maxStep) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Revenue by tier */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by tier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.keys(revenue.byTier).length === 0 && (
                <p className="text-sm text-muted-foreground">No paid deals yet.</p>
              )}
              {Object.entries(revenue.byTier).map(([tier, v]) => (
                <div key={tier} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{tier}</span>
                  <span className="text-sm">
                    {formatBDT(v.revenue)}{" "}
                    <span className="text-muted-foreground">({v.count})</span>
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Channel health */}
          <Card>
            <CardHeader>
              <CardTitle>Channel health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["email", "whatsapp", "sms"] as const).map((ch) => {
                const c = channels[ch] ?? {};
                const sent =
                  (c.sent ?? 0) + (c.delivered ?? 0) + (c.read ?? 0);
                const failed = c.failed ?? 0;
                return (
                  <div key={ch} className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{ch}</span>
                    <span className="text-muted-foreground">
                      {sent} sent · {c.delivered ?? 0} delivered · {c.read ?? 0} read ·{" "}
                      <span className={failed ? "text-destructive" : ""}>
                        {failed} failed
                      </span>
                    </span>
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge tone={providers.email === "mock" ? "amber" : "green"}>
                  email: {providers.email}
                </Badge>
                <Badge tone={providers.whatsapp === "mock" ? "amber" : "green"}>
                  whatsapp: {providers.whatsapp}
                </Badge>
                <Badge tone={providers.sms === "mock" ? "amber" : "green"}>
                  sms: {providers.sms}
                </Badge>
                <Badge tone={providers.inngest === "dev" ? "amber" : "green"}>
                  inngest: {providers.inngest}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Team performance */}
          <Card>
            <CardHeader>
              <CardTitle>Team performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {team.length === 0 && (
                <p className="text-sm text-muted-foreground">No team members.</p>
              )}
              {team.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-muted-foreground">
                    {t.assigned} leads · {t.conversions} won · {t.tasksDone}/
                    {t.tasksDone + t.tasksOpen} tasks
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
