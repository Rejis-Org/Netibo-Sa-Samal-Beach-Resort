"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Database, Json } from "@/lib/supabase/database.types";
import { getAdminContext } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { randomBytes } from "node:crypto";
import { expireUnpaidHolds } from "@/lib/booking-maintenance";
import { sendBookingStatusEmail } from "@/lib/notifications";
import { addDays, checkExtension, dayCount, findConflicts } from "@/lib/availability";
import { normalizeCorkageItems, parseCorkageRows, resolveTotal } from "@/lib/pricing";
import { manilaToday } from "@/lib/booking-data";
import { loadDailyReport } from "@/lib/daily-report-data";
import { priceBooking } from "@/lib/booking-price";

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
  const freeEntrance = readInteger(formData, "free_entrance_count");

  if (!id || !name || !type || !["cottage", "room", "hall", "kubo"].includes(type) || price === undefined || capacityMin === undefined || capacityMax === undefined || sortOrder === undefined || sortOrder === null || photosRaw === null || priceNote === null || freeEntrance === undefined || freeEntrance === null || freeEntrance > 1000) {
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
    price_amount: price, price_note: priceNote || null, free_entrance_count: freeEntrance,
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

  await expireUnpaidHolds();
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
  await sendBookingStatusEmail(oldRow, status);
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  redirect("/admin?saved=booking#bookings");
}

function validDateText(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value);
}

// Records a booking made by phone, Messenger or at the gate. It follows the same availability and pricing rules as the
// public form: taken places are refused, and the total is calculated unless the admin types one in.
export async function createManualBookingAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");

  const kind = readText(formData, "kind", 20);
  const date = readText(formData, "date", 10);
  const dateEndInput = readText(formData, "date_end", 10);
  const guestName = readText(formData, "guest_name", 160);
  const phone = readText(formData, "phone", 40);
  const notes = readText(formData, "notes", 1000);
  const packageId = readText(formData, "package_id", 64);
  const status = readText(formData, "status", 20);
  const visit = readText(formData, "visit_type", 20);
  const adults = readInteger(formData, "adults");
  const children = readInteger(formData, "children");
  const manualTotal = readMoney(formData, "total");
  const checkInNow = formData.get("check_in_now") === "on";
  const corkage = parseCorkageRows(readStrings(formData, "corkage_label", 200), readStrings(formData, "corkage_amount", 40));
  const unitIds = kind === "unit" ? [...new Set(readStrings(formData, "unit_id", 64).filter(Boolean))] : [];
  // Only room and cottage stays run several days; whole-resort and entrance-only bookings are one date.
  const dateEnd = kind === "unit" ? dateEndInput || date : date;
  if (
    (kind !== "exclusive" && kind !== "unit" && kind !== "entrance") || !validDateText(date) || !validDateText(dateEnd) || dateEnd < date ||
    !guestName || !phone || phone.length < 7 || notes === null || packageId === null || (status !== "confirmed" && status !== "pending") ||
    typeof adults !== "number" || typeof children !== "number" || adults > 1000 || children > 1000 || adults + children < 1 ||
    manualTotal === undefined || corkage.invalid || (kind !== "exclusive" && visit !== "day-tour" && visit !== "overnight") ||
    (kind === "unit" && (unitIds.length < 1 || unitIds.length > 10))
  ) {
    redirect("/admin?error=manual#bookings");
  }
  const days = dayCount(date, dateEnd);
  if (days < 1 || days > 60) redirect("/admin?error=manual#bookings");
  // The checks above only accept these values, but TypeScript cannot carry that through the long condition.
  const bookingKind = kind as "exclusive" | "unit" | "entrance";
  const bookingStatus = status as "confirmed" | "pending";
  // Checking a guest in straight away is for walk-ins: a confirmed booking that starts today.
  if (checkInNow && (status !== "confirmed" || date !== manilaToday())) redirect("/admin?error=checkin#logbook");

  if (kind === "exclusive") {
    if (!packageId) redirect("/admin?error=manual#bookings");
    const { data: item } = await admin.supabase.from("packages").select("id,scope").eq("id", packageId).maybeSingle();
    if (!item || item.scope !== "exclusive") redirect("/admin?error=manual#bookings");
  }

  await expireUnpaidHolds();
  const [{ data: blocked }, { data: existing }] = await Promise.all([
    admin.supabase.from("blocked_dates").select("date").gte("date", date).lte("date", dateEnd),
    admin.supabase.from("bookings").select("id,type,unit_ids,status,hold_expires_at,date_start,date_end").lte("date_start", dateEnd).gte("date_end", date).not("status", "in", "(cancelled,completed)"),
  ]);
  const conflicts = findConflicts({ kind: bookingKind, start: date, end: dateEnd, unitIds, bookings: existing ?? [], blockedDates: (blocked ?? []).map((row) => row.date) });
  if (conflicts.length) redirect("/admin?error=manual#bookings");

  const visitType = kind === "exclusive" ? null : (visit as "day-tour" | "overnight");
  const priced = await priceBooking(
    admin.supabase,
    { type: bookingKind, package_id: kind === "exclusive" ? packageId : null, unit_ids: unitIds, date_start: date, date_end: dateEnd, visit_type: visitType, price_breakdown: null },
    { adults, children, corkage: corkage.items, useSnapshot: false },
  );
  if (!priced) redirect("/admin?error=price#bookings");
  const { total, overridden } = resolveTotal(priced.total, manualTotal);

  const record = {
    ref_code: `NSM-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`,
    type: bookingKind,
    package_id: kind === "exclusive" ? packageId : null,
    unit_ids: unitIds,
    date_start: date,
    date_end: dateEnd,
    adults,
    children,
    guest_name: guestName,
    phone,
    guest_email: null,
    contact_extra: null,
    notes: notes || null,
    status: bookingStatus,
    total_amount: total,
    visit_type: visitType,
    corkage_items: corkage.items as unknown as Json,
    price_breakdown: priced as unknown as Json,
    total_overridden: overridden,
    deposit_required: null,
    payment_deadline: null,
    hold_expires_at: null,
    guest_uid: null,
  };
  const { data, error } = await admin.supabase.from("bookings").insert(record).select("id").single();
  if (error || !data) redirect("/admin?error=manual#bookings");
  await logChange(admin.supabase, admin.userId, "bookings", data.id, null, record as unknown as Json);
  if (checkInNow) {
    const { error: logError } = await admin.supabase.from("guest_log").insert({ booking_id: data.id, actual_adults: adults, actual_children: children, checked_in_by: admin.userId });
    if (logError) redirect("/admin?error=checkin#logbook");
  }
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  redirect(checkInNow ? "/admin?saved=checkin#logbook" : "/admin?saved=manual#bookings");
}

// Logbook: a guest arrives. The stay must cover today and be confirmed or awaiting payment.
export async function checkInAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");
  const id = readText(formData, "booking_id", 64);
  const adults = readInteger(formData, "adults");
  const children = readInteger(formData, "children");
  if (!id || typeof adults !== "number" || typeof children !== "number" || adults > 1000 || children > 1000 || adults + children < 1) redirect("/admin?error=checkin#logbook");
  const today = manilaToday();
  const { data: booking } = await admin.supabase.from("bookings").select("id,status,date_start,date_end").eq("id", id).maybeSingle();
  if (!booking || (booking.status !== "confirmed" && booking.status !== "awaiting_payment") || booking.date_start > today || booking.date_end < today) redirect("/admin?error=checkin#logbook");
  const { data, error } = await admin.supabase.from("guest_log").insert({ booking_id: id, actual_adults: adults, actual_children: children, checked_in_by: admin.userId }).select("id").single();
  if (error || !data) redirect(`/admin?error=${error?.code === "23505" ? "alreadyIn" : "checkin"}#logbook`);
  await logChange(admin.supabase, admin.userId, "guest_log", data.id, null, { booking_id: id, actual_adults: adults, actual_children: children });
  revalidatePath("/admin");
  redirect("/admin?saved=checkin#logbook");
}

// Logbook: a guest leaves. When it is the last day of a confirmed stay, the booking is marked completed too.
export async function checkOutAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");
  const id = readText(formData, "log_id", 64);
  if (!id) redirect("/admin?error=checkin#logbook");
  const { data: entry } = await admin.supabase.from("guest_log").select("id,booking_id,checked_out_at").eq("id", id).maybeSingle();
  if (!entry || entry.checked_out_at !== null) redirect("/admin?error=checkin#logbook");
  const { error } = await admin.supabase.from("guest_log").update({ checked_out_at: new Date().toISOString() }).eq("id", id).is("checked_out_at", null);
  if (error) redirect("/admin?error=checkin#logbook");
  await logChange(admin.supabase, admin.userId, "guest_log", id, entry as unknown as Json, { checked_out: true });
  const { data: booking } = await admin.supabase.from("bookings").select("id,status,date_end").eq("id", entry.booking_id).maybeSingle();
  if (booking && booking.status === "confirmed" && booking.date_end <= manilaToday()) {
    const update = { status: "completed" as const, hold_expires_at: null };
    const { error: completeError } = await admin.supabase.from("bookings").update(update).eq("id", booking.id);
    if (!completeError) await logChange(admin.supabase, admin.userId, "bookings", booking.id, { status: booking.status }, update as unknown as Json);
  }
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  redirect("/admin?saved=checkout#logbook");
}

// End of day: saves the report as it stands, so later price edits never change a closed day.
export async function closeDayAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");
  const date = readText(formData, "date", 10);
  if (!validDateText(date) || date > manilaToday()) redirect("/admin/reports?error=date");
  const report = await loadDailyReport(admin.supabase, date);
  if (!report) redirect(`/admin/reports?date=${date}&error=load`);
  const { error } = await admin.supabase.from("daily_reports").upsert({ report_date: date, data: report as unknown as Json, closed_by: admin.userId, closed_at: new Date().toISOString() }, { onConflict: "report_date" });
  if (error) redirect(`/admin/reports?date=${date}&error=load`);
  await logChange(admin.supabase, admin.userId, "daily_reports", date, null, { closed: true });
  revalidatePath("/admin/reports");
  redirect(`/admin/reports?date=${date}&saved=1`);
}

// Money that may have centavos, such as a total that includes corkage. Blank is null; anything invalid is undefined.
function readMoney(formData: FormData, name: string) {
  const value = readText(formData, name, 20);
  if (value === null) return undefined;
  if (value === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return undefined;
  const number = Number(value);
  return number <= 100_000_000 ? number : undefined;
}

function readStrings(formData: FormData, name: string, max: number) {
  return formData.getAll(name).map((value) => (typeof value === "string" ? value.trim().slice(0, max) : ""));
}

// Corkage items guests can add with one tap on the booking form. Owner only, like the other resort settings.
export async function saveCorkagePresetsAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "owner") redirect("/admin?error=access#settings");
  const parsed = parseCorkageRows(readStrings(formData, "corkage_label", 200), readStrings(formData, "corkage_amount", 40));
  if (parsed.invalid) redirect("/admin?error=settings#settings");
  const value = parsed.items as unknown as Json;
  const { data: oldRow } = await admin.supabase.from("settings").select("*").eq("key", "corkage_presets").maybeSingle();
  const { error } = await admin.supabase.from("settings").upsert({ key: "corkage_presets", value, updated_by: admin.userId }, { onConflict: "key" });
  if (error) redirect("/admin?error=settings#settings");
  await logChange(admin.supabase, admin.userId, "settings", "corkage_presets", (oldRow as unknown as Json) ?? null, { key: "corkage_presets", value, updated_by: admin.userId });
  revalidatePath("/", "layout");
  redirect("/admin?saved=settings#settings");
}

// Fixes guest details, headcount, corkage and the total. The total is only recalculated from current prices on request,
// so editing a phone number never changes what a guest was quoted.
export async function editBookingAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");
  const id = readText(formData, "booking_id", 64);
  const guestName = readText(formData, "guest_name", 160);
  const phone = readText(formData, "phone", 40);
  const notes = readText(formData, "notes", 1000);
  const adults = readInteger(formData, "adults");
  const children = readInteger(formData, "children");
  const total = readMoney(formData, "total");
  const recalc = formData.get("recalc") === "on";
  const corkage = parseCorkageRows(readStrings(formData, "corkage_label", 200), readStrings(formData, "corkage_amount", 40));
  if (!id || !guestName || !phone || phone.length < 7 || notes === null || typeof adults !== "number" || typeof children !== "number" || adults > 1000 || children > 1000 || adults + children < 1 || corkage.invalid || total === undefined || (!recalc && total === null)) {
    redirect("/admin?error=booking#bookings");
  }

  const { data: oldRow, error: readError } = await admin.supabase.from("bookings").select("*").eq("id", id).maybeSingle();
  if (readError || !oldRow) redirect("/admin?error=booking#bookings");
  let nextTotal = oldRow.total_amount;
  let breakdown: Json | null = oldRow.price_breakdown;
  let overridden = oldRow.total_overridden;
  if (recalc) {
    const priced = await priceBooking(admin.supabase, oldRow, { adults, children, corkage: corkage.items, useSnapshot: false });
    if (!priced) redirect("/admin?error=price#bookings");
    nextTotal = priced.total;
    breakdown = priced as unknown as Json;
    overridden = false;
  } else {
    nextTotal = total ?? oldRow.total_amount;
    overridden = oldRow.total_overridden || nextTotal !== oldRow.total_amount;
  }
  const update = {
    guest_name: guestName, phone, notes: notes || null, adults, children,
    corkage_items: corkage.items as unknown as Json,
    total_amount: nextTotal, price_breakdown: breakdown, total_overridden: overridden,
  };
  const { error } = await admin.supabase.from("bookings").update(update).eq("id", id);
  if (error) redirect("/admin?error=booking#bookings");
  await logChange(admin.supabase, admin.userId, "bookings", id, oldRow as unknown as Json, update as unknown as Json);
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  redirect("/admin?saved=booking#bookings");
}

// Adds days to the end of a room stay when the following days are free. The total grows by the extra days at the booking's own rates.
export async function extendBookingAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");
  const id = readText(formData, "booking_id", 64);
  const extraDays = readInteger(formData, "extra_days");
  if (!id || typeof extraDays !== "number" || extraDays < 1 || extraDays > 14) redirect("/admin?error=extend#bookings");

  await expireUnpaidHolds();
  const { data: booking, error: readError } = await admin.supabase.from("bookings").select("*").eq("id", id).maybeSingle();
  if (readError || !booking || booking.type !== "unit" || (booking.status !== "confirmed" && booking.status !== "awaiting_payment")) redirect("/admin?error=extend#bookings");

  const newEnd = addDays(booking.date_end, extraDays);
  const [{ data: others }, { data: blocked }] = await Promise.all([
    admin.supabase.from("bookings").select("id,type,unit_ids,status,hold_expires_at,date_start,date_end")
      .lte("date_start", newEnd).gte("date_end", addDays(booking.date_end, 1)).not("status", "in", "(cancelled,completed)"),
    admin.supabase.from("blocked_dates").select("date").gte("date", addDays(booking.date_end, 1)).lte("date", newEnd),
  ]);
  const check = checkExtension({ booking, extraDays, bookings: others ?? [], blockedDates: (blocked ?? []).map((row) => row.date) });
  if (!check.ok) redirect("/admin?error=extendConflict#bookings");

  const common = { adults: booking.adults, children: booking.children, corkage: normalizeCorkageItems(booking.corkage_items), useSnapshot: true };
  const oldDays = dayCount(booking.date_start, booking.date_end);
  const [before, after] = await Promise.all([
    priceBooking(admin.supabase, booking, { ...common, days: oldDays }),
    priceBooking(admin.supabase, booking, { ...common, days: oldDays + extraDays }),
  ]);
  if (!before || !after) redirect("/admin?error=price#bookings");
  const update = {
    date_end: check.newEnd,
    total_amount: Math.round((booking.total_amount + (after.total - before.total)) * 100) / 100,
    price_breakdown: after as unknown as Json,
  };
  const { error } = await admin.supabase.from("bookings").update(update).eq("id", id);
  if (error) redirect(`/admin?error=${error.code === "23P01" ? "extendConflict" : "extend"}#bookings`);
  await logChange(admin.supabase, admin.userId, "bookings", id, booking as unknown as Json, update as unknown as Json);
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  redirect("/admin?saved=extended#bookings");
}

export async function addBlockedDateAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");

  const date = readText(formData, "date", 10);
  const reasonInput = readText(formData, "reason", 120);
  if (!validDateText(date) || reasonInput === null) redirect("/admin?error=blocked#blocked-dates");
  const reason = reasonInput || "closed";

  const { data: clash } = await admin.supabase.from("bookings").select("id")
    .lte("date_start", date).gte("date_end", date).in("status", ["awaiting_payment", "confirmed"]).limit(1);
  if (clash && clash.length > 0) redirect("/admin?error=blockedConflict#blocked-dates");

  const { data, error } = await admin.supabase.from("blocked_dates").insert({ date, reason, created_by: admin.userId }).select("id").single();
  if (error || !data) redirect(`/admin?error=${error?.code === "23505" ? "blockedExists" : "blocked"}#blocked-dates`);
  await logChange(admin.supabase, admin.userId, "blocked_dates", data.id, null, { date, reason });
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  redirect("/admin?saved=blocked#blocked-dates");
}

export async function removeBlockedDateAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");

  const id = readText(formData, "id", 64);
  if (!id) redirect("/admin?error=blocked#blocked-dates");
  const { data: oldRow } = await admin.supabase.from("blocked_dates").select("*").eq("id", id).maybeSingle();
  if (!oldRow) redirect("/admin?error=blocked#blocked-dates");
  const { error } = await admin.supabase.from("blocked_dates").delete().eq("id", id);
  if (error) redirect("/admin?error=blocked#blocked-dates");
  await logChange(admin.supabase, admin.userId, "blocked_dates", id, oldRow as unknown as Json, { removed: true });
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  redirect("/admin?saved=blocked#blocked-dates");
}
