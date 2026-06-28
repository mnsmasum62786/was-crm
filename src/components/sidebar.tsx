"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  Workflow,
  CalendarDays,
  CircleDollarSign,
  BadgeCheck,
  CheckSquare,
  Send,
  FileText,
  ScrollText,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/sequences", label: "Sequences", icon: Workflow },
  { href: "/batches", label: "Batches", icon: CalendarDays },
  { href: "/deals", label: "Deals", icon: CircleDollarSign },
  { href: "/memberships", label: "Memberships", icon: BadgeCheck },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/broadcasts", label: "Broadcasts", icon: Send },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/audit", label: "Audit Log", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ user }: { user: { name?: string | null; role: string } }) {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r bg-card">
      <div className="px-5 py-5 text-xl font-bold text-primary">WAS CRM</div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <div className="mb-2 px-2">
          <div className="truncate text-sm font-medium">{user.name ?? "User"}</div>
          <div className="text-xs capitalize text-muted-foreground">{user.role}</div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
