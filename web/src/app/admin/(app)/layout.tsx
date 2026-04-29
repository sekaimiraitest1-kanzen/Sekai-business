import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/admin-session";
import { AdminShell } from "./_shell/admin-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return <AdminShell session={session}>{children}</AdminShell>;
}
