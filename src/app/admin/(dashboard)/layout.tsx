import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { AdminShell } from "@/app/admin/_components/layout/admin-shell";

// The sidebar lives here so it stays on screen while the section on the right loads.
export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!getSupabaseEnv()) return <>{children}</>;
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?error=access");
  return (
    <AdminShell email={admin.email} role={admin.role}>
      {children}
    </AdminShell>
  );
}
