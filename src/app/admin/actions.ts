"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Database, Json } from "@/lib/supabase/database.types";
import { getAdminContext } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function readText(formData: FormData, name: string, max = 250) {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : null;
}

function readInteger(formData: FormData, name: string, allowBlank = false) {
  const value = readText(formData, name, 30);
  if (value === null || (value === "" && allowBlank)) return value === "" ? null : undefined;
  if (!value || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : undefined;
}

async function logChange(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  actorId: string,
  table: string,
  targetId: string,
  oldData: Json | null,
  newData: Json,
) {
  const { error } = await supabase.from("audit_log").insert({
    actor_id: actorId,
    action: "updated",
    target_table: table,
    target_id: targetId,
    old_data: oldData,
    new_data: newData,
  });
  if (error) throw new Error("The change was saved, but its audit entry could not be written.");
}

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

  const { data: { user } } = await supabase.auth.getUser();
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

export async function saveUnitAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");

  const id = readText(formData, "id", 64);
  const name = readText(formData, "name", 120);
  const type = readText(formData, "type", 20);
  const price = readInteger(formData, "price", true);
  const capacityMin = readInteger(formData, "capacity_min", true);
  const capacityMax = readInteger(formData, "capacity_max", true);
  const sortOrder = readInteger(formData, "sort_order");
  const photosRaw = readText(formData, "photos", 2000);
  const priceNote = readText(formData, "price_note", 300);

  if (!id || !name || !type || !["cottage", "room", "hall", "kubo"].includes(type) || price === undefined || capacityMin === undefined || capacityMax === undefined || sortOrder === undefined || sortOrder === null || photosRaw === null || priceNote === null) {
    redirect("/admin?error=unit#units");
  }
  if ((capacityMin !== null && capacityMin > 10_000) || (capacityMax !== null && capacityMax > 10_000) || sortOrder > 100_000 || (capacityMin !== null && capacityMax !== null && capacityMin > capacityMax) || (price !== null && price > 100_000_000)) {
    redirect("/admin?error=unit#units");
  }

  const { data: oldRow, error: readError } = await admin.supabase.from("units").select("*").eq("id", id).maybeSingle();
  if (readError || !oldRow) redirect("/admin?error=unit#units");
  const update = {
    name, type: type as "cottage" | "room" | "hall" | "kubo",
    capacity_min: capacityMin, capacity_max: capacityMax,
    aircon: formData.get("aircon") === "on",
    has_own_cr: formData.get("has_own_cr") === "on",
    price_amount: price, price_note: priceNote || null,
    photos: photosRaw.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, 12),
    active: formData.get("active") === "on", sort_order: sortOrder,
  };
  const { error } = await admin.supabase.from("units").update(update).eq("id", id);
  if (error) redirect("/admin?error=unit#units");
  await logChange(admin.supabase, admin.userId, "units", id, oldRow as unknown as Json, update as unknown as Json);
  revalidatePath("/", "layout");
  redirect("/admin?saved=unit#units");
}

export async function savePackageAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");

  const id = readText(formData, "id", 64);
  const nameEn = readText(formData, "name_en", 120);
  const nameFil = readText(formData, "name_fil", 120);
  const nameCeb = readText(formData, "name_ceb", 120);
  const price = readInteger(formData, "price", true);
  const pax = readInteger(formData, "pax_included", true);
  const sortOrder = readInteger(formData, "sort_order");
  const scope = readText(formData, "scope", 20);
  const notesEn = readText(formData, "notes_en", 1000);
  const notesFil = readText(formData, "notes_fil", 1000);
  const notesCeb = readText(formData, "notes_ceb", 1000);
  if (!id || !nameEn || !nameFil || !nameCeb || price === undefined || pax === undefined || sortOrder === undefined || sortOrder === null || !scope || !["exclusive", "walk-in"].includes(scope) || notesEn === null || notesFil === null || notesCeb === null) {
    redirect("/admin?error=package#packages");
  }
  if ((price !== null && price > 100_000_000) || (pax !== null && pax > 10_000) || sortOrder > 100_000 || (formData.get("weekday_only") === "on" && formData.get("weekend_only") === "on")) {
    redirect("/admin?error=package#packages");
  }

  const { data: oldRow, error: readError } = await admin.supabase.from("packages").select("*").eq("id", id).maybeSingle();
  if (readError || !oldRow) redirect("/admin?error=package#packages");
  const update = {
    name: { en: nameEn, fil: nameFil, ceb: nameCeb },
    scope: scope as "exclusive" | "walk-in", price_amount: price, pax_included: pax,
    weekday_only: formData.get("weekday_only") === "on",
    weekend_only: formData.get("weekend_only") === "on",
    notes: { en: notesEn, fil: notesFil, ceb: notesCeb },
    active: formData.get("active") === "on", sort_order: sortOrder,
  };
  const { error } = await admin.supabase.from("packages").update(update).eq("id", id);
  if (error) redirect("/admin?error=package#packages");
  await logChange(admin.supabase, admin.userId, "packages", id, oldRow as unknown as Json, update as unknown as Json);
  revalidatePath("/", "layout");
  redirect("/admin?saved=package#packages");
}

const settingDefinitions = {
  contact_phone: "text", gcash_number: "text", gcash_account_name: "text",
  deposit_amount: "integer", deposit_percent: "number", payment_deadline_hours: "integer",
  extra_guest_fee: "integer", reply_time_hours: "integer", day_tour_start: "text",
  overnight_start: "text", cancellation_refund_policy: "text", arrival_directions: "text",
} as const;

export async function saveSettingAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "owner") redirect("/admin?error=access#settings");
  const key = readText(formData, "key", 80) as keyof typeof settingDefinitions | null;
  const raw = readText(formData, "value", 2000);
  if (!key || !Object.hasOwn(settingDefinitions, key) || raw === null) redirect("/admin?error=settings#settings");

  let value: Json;
  const kind = settingDefinitions[key];
  if (kind === "text") {
    value = raw === "" ? null : raw;
  } else if (raw === "") {
    value = null;
  } else {
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric < 0 || (kind === "integer" && !Number.isSafeInteger(numeric)) || (key === "deposit_percent" && numeric > 100)) {
      redirect("/admin?error=settings#settings");
    }
    value = numeric;
  }

  const { data: oldRow } = await admin.supabase.from("settings").select("*").eq("key", key).maybeSingle();
  const { error } = await admin.supabase.from("settings").upsert({ key, value, updated_by: admin.userId }, { onConflict: "key" });
  if (error) redirect("/admin?error=settings#settings");
  await logChange(admin.supabase, admin.userId, "settings", key, oldRow as unknown as Json ?? null, { key, value, updated_by: admin.userId });
  revalidatePath("/", "layout");
  redirect("/admin?saved=settings#settings");
}

export async function updateBookingStatusAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");
  const id = readText(formData, "booking_id", 64);
  const action = readText(formData, "booking_action", 32);
  if (!id || !action || !["approve", "decline", "paid", "cancel", "complete"].includes(action)) redirect("/admin?error=booking#bookings");

  const { data: oldRow, error: readError } = await admin.supabase.from("bookings").select("*").eq("id", id).maybeSingle();
  if (readError || !oldRow) redirect("/admin?error=booking#bookings");
  let status: "awaiting_payment" | "confirmed" | "cancelled" | "completed";
  let update: Partial<Database["public"]["Tables"]["bookings"]["Update"]> = {};
  if (action === "approve") {
    if (oldRow.status !== "pending") redirect("/admin?error=booking#bookings");
    const { data: deadlineSetting } = await admin.supabase.from("settings").select("value").eq("key", "payment_deadline_hours").maybeSingle();
    const hours = typeof deadlineSetting?.value === "number" ? deadlineSetting.value : null;
    if (hours === null || hours <= 0 || hours > 24 * 30) redirect("/admin?error=deadline#settings");
    const { data: depositAmount } = await admin.supabase.from("settings").select("value").eq("key", "deposit_amount").maybeSingle();
    const { data: depositPercent } = await admin.supabase.from("settings").select("value").eq("key", "deposit_percent").maybeSingle();
    const fixedDeposit = typeof depositAmount?.value === "number" ? depositAmount.value : null;
    const percent = typeof depositPercent?.value === "number" ? depositPercent.value : null;
    const deposit = fixedDeposit ?? (percent === null ? null : Math.ceil(oldRow.total_amount * percent / 100));
    const deadline = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    status = "awaiting_payment";
    update = { status, deposit_required: deposit, payment_deadline: deadline, hold_expires_at: deadline };
  } else if (action === "decline" || action === "cancel") {
    if (oldRow.status === "completed" || oldRow.status === "cancelled") redirect("/admin?error=booking#bookings");
    status = "cancelled";
    update = { status, hold_expires_at: null };
  } else if (action === "paid") {
    if (oldRow.status !== "awaiting_payment") redirect("/admin?error=booking#bookings");
    status = "confirmed";
    update = { status, hold_expires_at: null };
  } else {
    if (oldRow.status !== "confirmed") redirect("/admin?error=booking#bookings");
    status = "completed";
    update = { status, hold_expires_at: null };
  }

  const { error } = await admin.supabase.from("bookings").update(update).eq("id", id);
  if (error) redirect(`/admin?error=${error.code === "23P01" ? "conflict" : "booking"}#bookings`);
  await logChange(admin.supabase, admin.userId, "bookings", id, oldRow as unknown as Json, update as unknown as Json);
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  redirect("/admin?saved=booking#bookings");
}
