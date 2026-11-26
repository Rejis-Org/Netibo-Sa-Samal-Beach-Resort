"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Database, Json } from "@/lib/supabase/database.types";
import { getAdminContext } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { randomBytes } from "node:crypto";
import { expireUnpaidHolds } from "@/lib/booking-maintenance";
import { sendBookingStatusEmail } from "@/lib/notifications";
import { calculateCharges, catalogFromRows, withAdjustment, type BookingKind } from "@/lib/booking-pricing";

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
    redirect("/admin?section=units&error=unit");
  }
  if ((capacityMin !== null && capacityMin > 10_000) || (capacityMax !== null && capacityMax > 10_000) || sortOrder > 100_000 || (capacityMin !== null && capacityMax !== null && capacityMin > capacityMax) || (price !== null && price > 100_000_000)) {
    redirect("/admin?section=units&error=unit");
  }

  const { data: oldRow, error: readError } = await admin.supabase.from("units").select("*").eq("id", id).maybeSingle();
  if (readError || !oldRow) redirect("/admin?section=units&error=unit");
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
  if (error) redirect("/admin?section=units&error=unit");
  await logChange(admin.supabase, admin.userId, "units", id, oldRow as unknown as Json, update as unknown as Json);
  revalidatePath("/", "layout");
  redirect("/admin?section=units&saved=unit");
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
    redirect("/admin?section=packages&error=package");
  }
  if ((price !== null && price > 100_000_000) || (pax !== null && pax > 10_000) || sortOrder > 100_000 || (formData.get("weekday_only") === "on" && formData.get("weekend_only") === "on")) {
    redirect("/admin?section=packages&error=package");
  }

  const { data: oldRow, error: readError } = await admin.supabase.from("packages").select("*").eq("id", id).maybeSingle();
  if (readError || !oldRow) redirect("/admin?section=packages&error=package");
  const update = {
    name: { en: nameEn, fil: nameFil, ceb: nameCeb },
    scope: scope as "exclusive" | "walk-in", price_amount: price, pax_included: pax,
    weekday_only: formData.get("weekday_only") === "on",
    weekend_only: formData.get("weekend_only") === "on",
    notes: { en: notesEn, fil: notesFil, ceb: notesCeb },
    active: formData.get("active") === "on", sort_order: sortOrder,
  };
  const { error } = await admin.supabase.from("packages").update(update).eq("id", id);
  if (error) redirect("/admin?section=packages&error=package");
  await logChange(admin.supabase, admin.userId, "packages", id, oldRow as unknown as Json, update as unknown as Json);
  revalidatePath("/", "layout");
  redirect("/admin?section=packages&saved=package");
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
  if (admin.role !== "owner") redirect("/admin?section=settings&error=access");
  const key = readText(formData, "key", 80) as keyof typeof settingDefinitions | null;
  const raw = readText(formData, "value", 2000);
  if (!key || !Object.hasOwn(settingDefinitions, key) || raw === null) redirect("/admin?section=settings&error=settings");

  let value: Json;
  const kind = settingDefinitions[key];
  if (kind === "text") {
    value = raw === "" ? null : raw;
  } else if (raw === "") {
    value = null;
  } else {
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric < 0 || (kind === "integer" && !Number.isSafeInteger(numeric)) || (key === "deposit_percent" && numeric > 100)) {
      redirect("/admin?section=settings&error=settings");
    }
    value = numeric;
  }

  const { data: oldRow } = await admin.supabase.from("settings").select("*").eq("key", key).maybeSingle();
  const { error } = await admin.supabase.from("settings").upsert({ key, value, updated_by: admin.userId }, { onConflict: "key" });
  if (error) redirect("/admin?section=settings&error=settings");
  await logChange(admin.supabase, admin.userId, "settings", key, oldRow as unknown as Json ?? null, { key, value, updated_by: admin.userId });
  revalidatePath("/", "layout");
  redirect("/admin?section=settings&saved=settings");
}

export async function updateBookingStatusAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");
  const id = readText(formData, "booking_id", 64);
  const action = readText(formData, "booking_action", 32);
  if (!id || !action || !["approve", "decline", "paid", "cancel", "complete"].includes(action)) redirect("/admin?section=bookings&error=booking");

  await expireUnpaidHolds();
  const { data: oldRow, error: readError } = await admin.supabase.from("bookings").select("*").eq("id", id).maybeSingle();
  if (readError || !oldRow) redirect("/admin?section=bookings&error=booking");
  let status: "awaiting_payment" | "confirmed" | "cancelled" | "completed";
  let update: Partial<Database["public"]["Tables"]["bookings"]["Update"]> = {};
  if (action === "approve") {
    if (oldRow.status !== "pending") redirect("/admin?section=bookings&error=booking");
    const { data: deadlineSetting } = await admin.supabase.from("settings").select("value").eq("key", "payment_deadline_hours").maybeSingle();
    const hours = typeof deadlineSetting?.value === "number" ? deadlineSetting.value : null;
    if (hours === null || hours <= 0 || hours > 24 * 30) redirect("/admin?section=settings&error=deadline");
    const { data: depositAmount } = await admin.supabase.from("settings").select("value").eq("key", "deposit_amount").maybeSingle();
    const { data: depositPercent } = await admin.supabase.from("settings").select("value").eq("key", "deposit_percent").maybeSingle();
    const fixedDeposit = typeof depositAmount?.value === "number" ? depositAmount.value : null;
    const percent = typeof depositPercent?.value === "number" ? depositPercent.value : null;
    const deposit = fixedDeposit ?? (percent === null ? null : Math.ceil(oldRow.total_amount * percent / 100));
    const deadline = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    status = "awaiting_payment";
    update = { status, deposit_required: deposit, payment_deadline: deadline, hold_expires_at: deadline };
  } else if (action === "decline" || action === "cancel") {
    if (oldRow.status === "completed" || oldRow.status === "cancelled") redirect("/admin?section=bookings&error=booking");
    status = "cancelled";
    update = { status, hold_expires_at: null };
  } else if (action === "paid") {
    if (oldRow.status !== "awaiting_payment") redirect("/admin?section=bookings&error=booking");
    status = "confirmed";
    update = { status, hold_expires_at: null };
  } else {
    if (oldRow.status !== "confirmed") redirect("/admin?section=bookings&error=booking");
    status = "completed";
    update = { status, hold_expires_at: null };
  }

  const { error } = await admin.supabase.from("bookings").update(update).eq("id", id);
  if (error) redirect(`/admin?section=bookings&error=${error.code === "23P01" ? "conflict" : "booking"}`);
  await logChange(admin.supabase, admin.userId, "bookings", id, oldRow as unknown as Json, update as unknown as Json);
  await sendBookingStatusEmail(oldRow, status);
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  redirect("/admin?section=bookings&saved=booking");
}

function validDateText(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value);
}

// Records a booking made by phone or Messenger so the public calendar stays accurate.
export async function createManualBookingAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");

  const kind = readText(formData, "kind", 20);
  const date = readText(formData, "date", 10);
  const guestName = readText(formData, "guest_name", 160);
  const phone = readText(formData, "phone", 40);
  const notes = readText(formData, "notes", 1000);
  const packageId = readText(formData, "package_id", 64);
  const unitId = readText(formData, "unit_id", 64);
  const status = readText(formData, "status", 20);
  const visitType = readText(formData, "visit_type", 20) === "overnight" ? "overnight" : "day-tour";
  const totalMode = readText(formData, "total_mode", 10);
  const adults = readInteger(formData, "adults");
  const children = readInteger(formData, "children");
  const customTotal = readInteger(formData, "total", true);
  if (
    (kind !== "exclusive" && kind !== "unit" && kind !== "entrance") || !validDateText(date) || !guestName || !phone || phone.length < 7 ||
    notes === null || packageId === null || unitId === null || (status !== "confirmed" && status !== "pending") ||
    typeof adults !== "number" || typeof children !== "number" || (totalMode === "custom" && typeof customTotal !== "number") ||
    adults > 1000 || children > 1000 || adults + children < 1 || (typeof customTotal === "number" && customTotal > 100_000_000)
  ) {
    redirect("/admin?section=bookings&error=manual");
  }

  const [packageRows, unitRows, feeRow] = await Promise.all([
    admin.supabase.from("packages").select("id,slug,name,scope,price_amount,pax_included"),
    admin.supabase.from("units").select("id,name,price_amount"),
    admin.supabase.from("settings").select("value").eq("key", "extra_guest_fee").maybeSingle(),
  ]);
  if (packageRows.error || unitRows.error || feeRow.error) redirect("/admin?section=bookings&error=manual");
  const catalog = catalogFromRows(packageRows.data ?? [], unitRows.data ?? [], feeRow.data?.value);

  let packageRef: string | null = null;
  let unitIds: string[] = [];
  if (kind === "exclusive") {
    const item = catalog.packages.find((entry) => entry.id === packageId && entry.scope === "exclusive");
    if (!item) redirect("/admin?section=bookings&error=manual");
    packageRef = item.id;
  } else if (kind === "unit") {
    const unit = catalog.units.find((entry) => entry.id === unitId);
    if (!unit) redirect("/admin?section=bookings&error=manual");
    unitIds = [unit.id];
  }

  // The server recalculates the price so the saved receipt never depends on what the browser sent.
  const charges = calculateCharges({ kind: kind as BookingKind, packageId: packageRef, unitId: unitIds[0] ?? null, visitType, adults: adults as number, children: children as number }, catalog);
  let total: number;
  if (totalMode === "custom") total = customTotal as number;
  else if (charges.ok) total = charges.total;
  else redirect("/admin?section=bookings&error=manual");
  const fallbackLabel = kind === "exclusive"
    ? catalog.packages.find((entry) => entry.id === packageRef)?.name ?? "Whole-resort booking"
    : kind === "unit" ? catalog.units.find((entry) => entry.id === unitIds[0])?.name ?? "Cottage or room" : "Entrance fees";
  const lineItems = withAdjustment(charges.lines, total, fallbackLabel);

  await expireUnpaidHolds();
  const record = {
    ref_code: `NSM-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`,
    type: kind as "exclusive" | "unit" | "entrance",
    package_id: packageRef,
    unit_ids: unitIds,
    date_start: date as string,
    date_end: date as string,
    adults: adults as number,
    children: children as number,
    guest_name: guestName as string,
    phone: phone as string,
    guest_email: null,
    contact_extra: null,
    notes: notes || null,
    status: status as "confirmed" | "pending",
    total_amount: total as number,
    deposit_required: null,
    payment_deadline: null,
    hold_expires_at: null,
    guest_uid: null,
  };
  const snapshot = { version: 1, lines: lineItems } as unknown as Json;
  let { data, error } = await admin.supabase.from("bookings").insert({ ...record, line_items: snapshot }).select("id").single();
  // Until supabase/add-booking-line-items.sql has been run, save without the itemized snapshot.
  if (error && (error.code === "PGRST204" || error.code === "42703")) {
    ({ data, error } = await admin.supabase.from("bookings").insert(record).select("id").single());
  }
  if (error || !data) redirect(`/admin?section=bookings&error=${error?.code === "23P01" ? "conflict" : "manual"}`);
  await logChange(admin.supabase, admin.userId, "bookings", data.id, null, { ...record, line_items: snapshot } as unknown as Json);
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  redirect(`/admin?section=bookings&saved=manual&receipt=${data.id}`);
}

export async function addBlockedDateAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");

  const date = readText(formData, "date", 10);
  const reasonInput = readText(formData, "reason", 120);
  if (!validDateText(date) || reasonInput === null) redirect("/admin?section=blocked-dates&error=blocked");
  const reason = reasonInput || "closed";

  const { data: clash } = await admin.supabase.from("bookings").select("id")
    .lte("date_start", date).gte("date_end", date).in("status", ["awaiting_payment", "confirmed"]).limit(1);
  if (clash && clash.length > 0) redirect("/admin?section=blocked-dates&error=blockedConflict");

  const { data, error } = await admin.supabase.from("blocked_dates").insert({ date, reason, created_by: admin.userId }).select("id").single();
  if (error || !data) redirect(`/admin?section=blocked-dates&error=${error?.code === "23505" ? "blockedExists" : "blocked"}`);
  await logChange(admin.supabase, admin.userId, "blocked_dates", data.id, null, { date, reason });
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  redirect("/admin?section=blocked-dates&saved=blocked");
}

export async function removeBlockedDateAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");

  const id = readText(formData, "id", 64);
  if (!id) redirect("/admin?section=blocked-dates&error=blocked");
  const { data: oldRow } = await admin.supabase.from("blocked_dates").select("*").eq("id", id).maybeSingle();
  if (!oldRow) redirect("/admin?section=blocked-dates&error=blocked");
  const { error } = await admin.supabase.from("blocked_dates").delete().eq("id", id);
  if (error) redirect("/admin?section=blocked-dates&error=blocked");
  await logChange(admin.supabase, admin.userId, "blocked_dates", id, oldRow as unknown as Json, { removed: true });
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  redirect("/admin?section=blocked-dates&saved=blocked");
}
