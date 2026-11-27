"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readText } from "@/app/admin/_lib/action-helpers";

export async function loginAction(formData: FormData) {
  const email = readText(formData, "email", 254)?.toLowerCase();
  const password = formData.get("password");
  if (!email || typeof password !== "string" || password.length < 1 || password.length > 128) {
    redirect("/admin/login?error=credentials");
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    redirect("/admin/login?error=setup");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/admin/login?error=credentials");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=credentials");
  }

  const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (!role || (role.role !== "owner" && role.role !== "staff")) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=access");
  }

  redirect("/admin");
}

export async function logoutAction() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } finally {
    redirect("/admin/login");
  }
}
