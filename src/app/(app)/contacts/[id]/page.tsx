import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, STAGE_TONE } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StageChanger, ActionButton } from "@/components/interactive";
import { STAGES, STAGE_LABELS } from "@/lib/constants";
import { whatsappLink } from "@/lib/phone";
import { formatBDT, formatDateTime } from "@/lib/utils";
import {
  changeStageAction,
  optOutAction,
  addNoteAction,
  createDealAction,
  createTaskAction,
} from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function ContactDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      deals: { orderBy: { createdAt: "desc" } },
      memberships: { orderBy: { createdAt: "desc" } },
      consents: true,
      tasks: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
      enrollments: { include: { sequence: true } },
      assignedTo: true,
    },
  });
  if (!contact) notFound();

  const waLink = whatsappLink(contact.phone);
  const addNote = addNoteAction.bind(null, contact.id);

  return (
    <div>
      <PageHeader title={contact.name ?? "Unnamed contact"} description={contact.phone}>
        {waLink && (
          <a href={waLink} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">Message on WhatsApp</Button>
          </a>
        )}
      </PageHeader>

      <div className="grid gap-6 p-6 lg:grid-cols-3">
        {/* Left: profile + actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Stage">
                <StageChanger
                  contactId={contact.id}
                  current={contact.stage}
                  stages={STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }))}
                  action={changeStageAction}
                />
              </Row>
              <Row label="Email">{contact.email ?? "—"}</Row>
              <Row label="Segment">{contact.segment ?? "—"}</Row>
              <Row label="Source">{contact.source ?? "—"}</Row>
              <Row label="Assigned">{contact.assignedTo?.name ?? "—"}</Row>
              <Row label="Created">{formatDateTime(contact.createdAt)}</Row>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Attribution</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-xs">
              <Row label="utm_source">{contact.utmSource ?? "—"}</Row>
              <Row label="utm_medium">{contact.utmMedium ?? "—"}</Row>
              <Row label="utm_campaign">{contact.utmCampaign ?? "—"}</Row>
              <Row label="fbclid">{contact.fbclid ?? "—"}</Row>
              <Row label="referrer">{contact.referrer ?? "—"}</Row>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Consent</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(["email", "whatsapp", "sms"] as const).map((ch) => {
                const c = contact.consents.find((x) => x.channel === ch);
                const optedIn = c ? c.optedIn : true;
                return (
                  <div key={ch} className="flex items-center justify-between">
                    <span className="capitalize">{ch}</span>
                    <Badge tone={optedIn ? "green" : "red"}>
                      {optedIn ? "opted in" : "opted out"}
                    </Badge>
                  </div>
                );
              })}
              <ActionButton onAction={() => optOutAction(contact.id, "all")} variant="destructive">
                Opt out of all
              </ActionButton>
            </CardContent>
          </Card>
        </div>

        {/* Middle: timeline */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader><CardTitle>Activity timeline</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <form action={addNote} className="flex gap-2">
                <Input name="note" placeholder="Add a note…" required />
                <Button type="submit" size="sm">Add</Button>
              </form>
              <div className="space-y-3">
                {contact.activities.map((a) => (
                  <div key={a.id} className="border-l-2 border-muted pl-3">
                    <div className="text-sm">{a.summary}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.type} · {formatDateTime(a.createdAt)}
                    </div>
                  </div>
                ))}
                {contact.activities.length === 0 && (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: deals, tasks, sequences */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Deals</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {contact.deals.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{d.tier}</span>
                  <span>
                    {formatBDT(d.amount)}{" "}
                    <Badge tone={d.status === "paid" ? "green" : d.status === "failed" ? "red" : "amber"}>
                      {d.status}
                    </Badge>
                  </span>
                </div>
              ))}
              {contact.deals.length === 0 && (
                <p className="text-sm text-muted-foreground">No deals.</p>
              )}
              <form action={createDealAction} className="space-y-2 border-t pt-3">
                <input type="hidden" name="contactId" value={contact.id} />
                <div className="grid grid-cols-2 gap-2">
                  <Select name="tier" defaultValue="base">
                    <option value="workshop">Workshop</option>
                    <option value="base">Base</option>
                    <option value="vip">VIP</option>
                    <option value="renewal">Renewal</option>
                  </Select>
                  <Select name="status" defaultValue="paid">
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </Select>
                </div>
                <Input name="amount" type="number" placeholder="Amount (BDT)" defaultValue={5999} />
                <Button type="submit" size="sm" className="w-full">Record deal</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Tasks</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {contact.tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className={t.status === "done" ? "line-through text-muted-foreground" : ""}>
                    {t.title}
                  </span>
                  <Badge tone={t.status === "done" ? "green" : "amber"}>{t.status}</Badge>
                </div>
              ))}
              <form action={createTaskAction} className="flex gap-2 border-t pt-3">
                <input type="hidden" name="contactId" value={contact.id} />
                <Input name="title" placeholder="New task…" required />
                <Button type="submit" size="sm">Add</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Sequences</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {contact.enrollments.map((e) => (
                <div key={e.id} className="flex items-center justify-between">
                  <span>{e.sequence.name}</span>
                  <Badge tone={e.status === "active" ? "blue" : e.status === "completed" ? "green" : "gray"}>
                    {e.status}
                  </Badge>
                </div>
              ))}
              {contact.enrollments.length === 0 && (
                <p className="text-muted-foreground">Not enrolled in any sequence.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
