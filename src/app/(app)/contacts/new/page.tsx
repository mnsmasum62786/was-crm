import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { STAGES, STAGE_LABELS, SEGMENTS } from "@/lib/constants";
import { createContactAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default function NewContactPage() {
  return (
    <div>
      <PageHeader title="New contact" description="Manually add a lead or contact">
        <Link href="/contacts">
          <Button variant="outline" size="sm">Back to contacts</Button>
        </Link>
      </PageHeader>
      <div className="p-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Contact details</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createContactAction} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>
                    Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    name="phone"
                    required
                    placeholder="01712345678"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Any format — normalized to E.164 and deduped automatically.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input name="name" placeholder="Full name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input name="email" type="email" placeholder="name@email.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Facebook profile URL</Label>
                  <Input name="fbProfileUrl" placeholder="https://facebook.com/…" />
                </div>
                <div className="space-y-1.5">
                  <Label>Segment</Label>
                  <Select name="segment" defaultValue="">
                    <option value="">— none —</option>
                    {SEGMENTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Stage</Label>
                  <Select name="stage" defaultValue="lead">
                    {STAGES.map((s) => (
                      <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Source</Label>
                  <Input name="source" defaultValue="manual" placeholder="manual" />
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="mb-3 text-sm font-medium">Attribution (optional)</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input name="utm_source" placeholder="utm_source" />
                  <Input name="utm_medium" placeholder="utm_medium" />
                  <Input name="utm_campaign" placeholder="utm_campaign" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">Create contact</Button>
                <Link href="/contacts">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
