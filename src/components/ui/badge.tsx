import * as React from "react";
import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  default: "bg-primary/10 text-primary",
  gray: "bg-muted text-muted-foreground",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
};

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone] ?? tones.default,
        className
      )}
      {...props}
    />
  );
}

export const STAGE_TONE: Record<string, keyof typeof tones> = {
  lead: "gray",
  workshop_registered: "blue",
  workshop_attended: "purple",
  base_member: "green",
  vip_member: "amber",
  renewed: "green",
  churned: "red",
};
