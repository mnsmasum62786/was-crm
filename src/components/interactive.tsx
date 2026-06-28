"use client";

import { useTransition } from "react";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function StageChanger({
  contactId,
  current,
  stages,
  action,
}: {
  contactId: string;
  current: string;
  stages: { value: string; label: string }[];
  action: (contactId: string, stage: string) => Promise<void>;
}) {
  const [pending, start] = useTransition();
  return (
    <Select
      defaultValue={current}
      disabled={pending}
      onChange={(e) => start(() => action(contactId, e.target.value).then(() => {}))}
      className="w-48"
    >
      {stages.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </Select>
  );
}

export function ActionButton({
  onAction,
  children,
  variant = "outline",
  size = "sm",
}: {
  onAction: () => Promise<unknown>;
  children: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={pending}
      onClick={() => start(() => onAction().then(() => {}))}
    >
      {pending ? "…" : children}
    </Button>
  );
}

export function SubmitButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button type="submit" className={className}>
      {children}
    </Button>
  );
}
