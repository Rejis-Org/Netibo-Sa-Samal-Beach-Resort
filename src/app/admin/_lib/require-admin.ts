import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";

// Every admin page checks access itself; the layout only draws the sidebar.
export async function requireAdmin() {
  if (!getSupabaseEnv()) redirect("/admin");
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?error=access");
  return admin;
}
