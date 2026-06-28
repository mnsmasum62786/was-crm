import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/rbac";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={{ name: user.name, role: user.role }} />
      <main className="flex-1 overflow-y-auto bg-muted/20">{children}</main>
    </div>
  );
}
