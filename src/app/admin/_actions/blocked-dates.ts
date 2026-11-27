"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Json } from "@/lib/supabase/database.types";
import { getAdminContext } from "@/lib/supabase/admin";
import { readText, validDateText, logChange } from "@/app/admin/_lib/action-helpers";

export async function addBlockedDateAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");

  const date = readText(formData, "date", 10);
  const reasonInput = readText(formData, "reason", 120);
  if (!validDateText(date) || reasonInput === null) redirect("/admin/blocked-dates?error=blocked");
  const reason = reasonInput || "closed";

  const { data: clash } = await admin.supabase
    .from("bookings")
    .select("id")
    .lte("date_start", date)
    .gte("date_end", date)
    .in("status", ["awaiting_payment", "confirmed"])
    .limit(1);
  if (clash && clash.length > 0) redirect("/admin/blocked-dates?error=blockedConflict");

  const { data, error } = await admin.supabase
    .from("blocked_dates")
    .insert({ date, reason, created_by: admin.userId })
    .select("id")
    .single();
  if (error || !data) redirect(`/admin/blocked-dates?error=${error?.code === "23505" ? "blockedExists" : "blocked"}`);
  await logChange(admin.supabase, admin.userId, "blocked_dates", data.id, null, { date, reason });
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  redirect("/admin/blocked-dates?saved=blocked");
}

export async function removeBlockedDateAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");

  const id = readText(formData, "id", 64);
  if (!id) redirect("/admin/blocked-dates?error=blocked");
  const { data: oldRow } = await admin.supabase.from("blocked_dates").select("*").eq("id", id).maybeSingle();
  if (!oldRow) redirect("/admin/blocked-dates?error=blocked");
  const { error } = await admin.supabase.from("blocked_dates").delete().eq("id", id);
  if (error) redirect("/admin/blocked-dates?error=blocked");
  await logChange(admin.supabase, admin.userId, "blocked_dates", id, oldRow as unknown as Json, { removed: true });
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  redirect("/admin/blocked-dates?saved=blocked");
}
