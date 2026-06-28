import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a BDT amount, e.g. 5999 -> "৳5,999". */
export function formatBDT(amount: number | null | undefined): string {
  if (amount == null) return "৳0";
  return "৳" + amount.toLocaleString("en-US");
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Replace {{var}} placeholders in a template body with values. */
export function renderTemplate(
  body: string,
  vars: Record<string, string | number | null | undefined>
): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    const v = vars[key];
    return v == null ? "" : String(v);
  });
}
