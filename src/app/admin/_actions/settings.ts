"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Json } from "@/lib/supabase/database.types";
import { getAdminContext } from "@/lib/supabase/admin";
import { parseCorkageRows } from "@/lib/pricing";
import { readText, readStrings, logChange } from "@/app/admin/_lib/action-helpers";

const settingDefinitions = {
  contact_phone: "text",
  gcash_number: "text",
  gcash_account_name: "text",
  deposit_amount: "integer",
  deposit_percent: "number",
  payment_deadline_hours: "integer",
  extra_guest_fee: "integer",
  reply_time_hours: "integer",
  day_tour_start: "text",
  overnight_start: "text",
  cancellation_refund_policy: "text",
  arrival_directions: "text",
} as const;

export async function saveSettingAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "owner") redirect("/admin/settings?error=access");
  const key = readText(formData, "key", 80) as keyof typeof settingDefinitions | null;
  const raw = readText(formData, "value", 2000);
  if (!key || !Object.hasOwn(settingDefinitions, key) || raw === null) redirect("/admin/settings?error=settings");

  let value: Json;
  const kind = settingDefinitions[key];
  if (kind === "text") {
    value = raw === "" ? null : raw;
  } else if (raw === "") {
    value = null;
  } else {
    const numeric = Number(raw);
    if (
      !Number.isFinite(numeric) ||
      numeric < 0 ||
      (kind === "integer" && !Number.isSafeInteger(numeric)) ||
      (key === "deposit_percent" && numeric > 100)
    ) {
      redirect("/admin/settings?error=settings");
    }
    value = numeric;
  }

  const { data: oldRow } = await admin.supabase.from("settings").select("*").eq("key", key).maybeSingle();
  const { error } = await admin.supabase
    .from("settings")
    .upsert({ key, value, updated_by: admin.userId }, { onConflict: "key" });
  if (error) redirect("/admin/settings?error=settings");
  await logChange(admin.supabase, admin.userId, "settings", key, (oldRow as unknown as Json) ?? null, {
    key,
    value,
    updated_by: admin.userId,
  });
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=settings");
}

// Corkage items guests can add with one tap on the booking form. Owner only, like the other resort settings.
export async function saveCorkagePresetsAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "owner") redirect("/admin/settings?error=access");
  const parsed = parseCorkageRows(
    readStrings(formData, "corkage_label", 200),
    readStrings(formData, "corkage_amount", 40),
  );
  if (parsed.invalid) redirect("/admin/settings?error=settings");
  const value = parsed.items as unknown as Json;
  const { data: oldRow } = await admin.supabase.from("settings").select("*").eq("key", "corkage_presets").maybeSingle();
  const { error } = await admin.supabase
    .from("settings")
    .upsert({ key: "corkage_presets", value, updated_by: admin.userId }, { onConflict: "key" });
  if (error) redirect("/admin/settings?error=settings");
  await logChange(admin.supabase, admin.userId, "settings", "corkage_presets", (oldRow as unknown as Json) ?? null, {
    key: "corkage_presets",
    value,
    updated_by: admin.userId,
  });
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=settings");
}
