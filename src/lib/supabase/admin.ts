import { createSupabaseServerClient } from "./server";

export type AdminRole = "owner" | "staff";

export async function getAdminContext() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (error || !userId) return null;

  const { data: roleRecord, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (roleError || !roleRecord || (roleRecord.role !== "owner" && roleRecord.role !== "staff")) return null;

  return {
    supabase,
    userId,
    email: typeof claims?.email === "string" ? claims.email : "",
    role: roleRecord.role as AdminRole,
  };
}
