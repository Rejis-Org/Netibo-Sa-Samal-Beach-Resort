"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Database, Json } from "@/lib/supabase/database.types";
import { getAdminContext } from "@/lib/supabase/admin";
import { randomBytes } from "node:crypto";
import { expireUnpaidHolds } from "@/lib/booking-maintenance";
import { sendBookingStatusEmail } from "@/lib/notifications";
import { addDays, checkExtension, dayCount, findConflicts } from "@/lib/availability";
import { normalizeCorkageItems, parseCorkageRows, resolveTotal } from "@/lib/pricing";
import { manilaToday } from "@/lib/booking-data";
import { priceBooking } from "@/lib/booking-price";
import {
  readText,
  readInteger,
  readMoney,
  readStrings,
  validDateText,
  logChange,
} from "@/app/admin/_lib/action-helpers";

const MAX_GUEST_NAMES = 60;

// One guest name per line. Blank lines are skipped. A missing field means no names.
// Returns null when the text, the list or a single name is too long.
function parseGuestNames(formData: FormData) {
  const text = formData.get("guest_names");
  if (typeof text !== "string") return [];
  if (text.length > 6000) return null;
  const names = text
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);
  if (names.length > MAX_GUEST_NAMES || names.some((name) => name.length > 160)) return null;
  return names;
}

export async function updateBookingStatusAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");
  const id = readText(formData, "booking_id", 64);
  const action = readText(formData, "booking_action", 32);
  if (!id || !action || !["approve", "decline", "paid", "cancel", "complete"].includes(action))
    redirect("/admin/bookings?error=booking");

  await expireUnpaidHolds();
  const { data: oldRow, error: readError } = await admin.supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (readError || !oldRow) redirect("/admin/bookings?error=booking");
  let status: "awaiting_payment" | "confirmed" | "cancelled" | "completed";
  let update: Partial<Database["public"]["Tables"]["bookings"]["Update"]> = {};
  if (action === "approve") {
    if (oldRow.status !== "pending") redirect("/admin/bookings?error=booking");
    const { data: deadlineSetting } = await admin.supabase
      .from("settings")
      .select("value")
      .eq("key", "payment_deadline_hours")
      .maybeSingle();
    const hours = typeof deadlineSetting?.value === "number" ? deadlineSetting.value : null;
    if (hours === null || hours <= 0 || hours > 24 * 30) redirect("/admin/settings?error=deadline");
    const { data: depositAmount } = await admin.supabase
      .from("settings")
      .select("value")
      .eq("key", "deposit_amount")
      .maybeSingle();
    const { data: depositPercent } = await admin.supabase
      .from("settings")
      .select("value")
      .eq("key", "deposit_percent")
      .maybeSingle();
    const fixedDeposit = typeof depositAmount?.value === "number" ? depositAmount.value : null;
    const percent = typeof depositPercent?.value === "number" ? depositPercent.value : null;
    const deposit = fixedDeposit ?? (percent === null ? null : Math.ceil((oldRow.total_amount * percent) / 100));
    const deadline = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    status = "awaiting_payment";
    update = { status, deposit_required: deposit, payment_deadline: deadline, hold_expires_at: deadline };
  } else if (action === "decline" || action === "cancel") {
    if (oldRow.status === "completed" || oldRow.status === "cancelled") redirect("/admin/bookings?error=booking");
    status = "cancelled";
    update = { status, hold_expires_at: null };
  } else if (action === "paid") {
    if (oldRow.status !== "awaiting_payment") redirect("/admin/bookings?error=booking");
    status = "confirmed";
    update = { status, hold_expires_at: null };
  } else {
    if (oldRow.status !== "confirmed") redirect("/admin/bookings?error=booking");
    status = "completed";
    update = { status, hold_expires_at: null };
  }

  const { error } = await admin.supabase.from("bookings").update(update).eq("id", id);
  if (error) redirect(`/admin/bookings?error=${error.code === "23P01" ? "conflict" : "booking"}`);
  await logChange(admin.supabase, admin.userId, "bookings", id, oldRow as unknown as Json, update as unknown as Json);
  await sendBookingStatusEmail(oldRow, status);
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  redirect("/admin/bookings?saved=booking");
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
  const guestNames = parseGuestNames(formData);
  const packageId = readText(formData, "package_id", 64);
  const status = readText(formData, "status", 20);
  const visit = readText(formData, "visit_type", 20);
  const adults = readInteger(formData, "adults");
  const children = readInteger(formData, "children");
  const manualTotal = readMoney(formData, "total");
  const checkInNow = formData.get("check_in_now") === "on";
  const corkage = parseCorkageRows(
    readStrings(formData, "corkage_label", 200),
    readStrings(formData, "corkage_amount", 40),
  );
  const unitIds = kind === "unit" ? [...new Set(readStrings(formData, "unit_id", 64).filter(Boolean))] : [];
  // Only room and cottage stays run several days; whole-resort and entrance-only bookings are one date.
  const dateEnd = kind === "unit" ? dateEndInput || date : date;
  if (
    (kind !== "exclusive" && kind !== "unit" && kind !== "entrance") ||
    !validDateText(date) ||
    !validDateText(dateEnd) ||
    dateEnd < date ||
    !guestName ||
    !phone ||
    phone.length < 7 ||
    notes === null ||
    guestNames === null ||
    packageId === null ||
    (status !== "confirmed" && status !== "pending") ||
    typeof adults !== "number" ||
    typeof children !== "number" ||
    adults > 1000 ||
    children > 1000 ||
    adults + children < 1 ||
    manualTotal === undefined ||
    corkage.invalid ||
    (kind !== "exclusive" && visit !== "day-tour" && visit !== "overnight") ||
    (kind === "unit" && (unitIds.length < 1 || unitIds.length > 10))
  ) {
    redirect("/admin/bookings?error=manual");
  }
  const days = dayCount(date, dateEnd);
  if (days < 1 || days > 60) redirect("/admin/bookings?error=manual");
  // The checks above only accept these values, but TypeScript cannot carry that through the long condition.
  const bookingKind = kind as "exclusive" | "unit" | "entrance";
  const bookingStatus = status as "confirmed" | "pending";
  // Checking a guest in straight away is for walk-ins: a confirmed booking that starts today.
  if (checkInNow && (status !== "confirmed" || date !== manilaToday())) redirect("/admin/logbook?error=checkin");

  if (kind === "exclusive") {
    if (!packageId) redirect("/admin/bookings?error=manual");
    const { data: item } = await admin.supabase.from("packages").select("id,scope").eq("id", packageId).maybeSingle();
    if (!item || item.scope !== "exclusive") redirect("/admin/bookings?error=manual");
  }

  await expireUnpaidHolds();
  const [{ data: blocked }, { data: existing }] = await Promise.all([
    admin.supabase.from("blocked_dates").select("date").gte("date", date).lte("date", dateEnd),
    admin.supabase
      .from("bookings")
      .select("id,type,unit_ids,status,hold_expires_at,date_start,date_end")
      .lte("date_start", dateEnd)
      .gte("date_end", date)
      .not("status", "in", "(cancelled,completed)"),
  ]);
  const conflicts = findConflicts({
    kind: bookingKind,
    start: date,
    end: dateEnd,
    unitIds,
    bookings: existing ?? [],
    blockedDates: (blocked ?? []).map((row) => row.date),
  });
  if (conflicts.length) redirect("/admin/bookings?error=manual");

  const visitType = kind === "exclusive" ? null : (visit as "day-tour" | "overnight");
  const priced = await priceBooking(
    admin.supabase,
    {
      type: bookingKind,
      package_id: kind === "exclusive" ? packageId : null,
      unit_ids: unitIds,
      date_start: date,
      date_end: dateEnd,
      visit_type: visitType,
      price_breakdown: null,
    },
    { adults, children, corkage: corkage.items, useSnapshot: false },
  );
  if (!priced) redirect("/admin/bookings?error=price");
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
    guest_names: guestNames ?? [],
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
  if (error || !data) redirect("/admin/bookings?error=manual");
  await logChange(admin.supabase, admin.userId, "bookings", data.id, null, record as unknown as Json);
  if (checkInNow) {
    const { error: logError } = await admin.supabase
      .from("guest_log")
      .insert({ booking_id: data.id, actual_adults: adults, actual_children: children, checked_in_by: admin.userId });
    if (logError) redirect("/admin/logbook?error=checkin");
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  redirect(checkInNow ? "/admin/logbook?saved=checkin" : `/admin/bookings?saved=manual&receipt=${data.id}`);
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
  const guestNames = parseGuestNames(formData);
  const corkage = parseCorkageRows(
    readStrings(formData, "corkage_label", 200),
    readStrings(formData, "corkage_amount", 40),
  );
  if (
    !id ||
    !guestName ||
    !phone ||
    phone.length < 7 ||
    notes === null ||
    guestNames === null ||
    typeof adults !== "number" ||
    typeof children !== "number" ||
    adults > 1000 ||
    children > 1000 ||
    adults + children < 1 ||
    corkage.invalid ||
    total === undefined ||
    (!recalc && total === null)
  ) {
    redirect("/admin/bookings?error=booking");
  }

  const { data: oldRow, error: readError } = await admin.supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (readError || !oldRow) redirect("/admin/bookings?error=booking");
  // When the headcount or corkage changes, the breakdown is rebuilt so the receipt and the total match the new guests.
  // "Recalculate" uses today's prices; otherwise the booking keeps the rates it was quoted at.
  const guestsChanged =
    adults !== oldRow.adults ||
    children !== oldRow.children ||
    JSON.stringify(corkage.items) !== JSON.stringify(normalizeCorkageItems(oldRow.corkage_items));
  const typedTotal = total !== null && total !== oldRow.total_amount;
  const priced =
    recalc || guestsChanged
      ? await priceBooking(admin.supabase, oldRow, {
          adults,
          children,
          corkage: corkage.items,
          useSnapshot: !recalc,
        })
      : null;
  if (recalc && !priced) redirect("/admin/bookings?error=price");
  let nextTotal = oldRow.total_amount;
  let breakdown: Json | null = oldRow.price_breakdown;
  let overridden = oldRow.total_overridden;
  if (priced) {
    breakdown = priced as unknown as Json;
    if (recalc || (!typedTotal && !oldRow.total_overridden)) {
      nextTotal = priced.total;
      overridden = false;
    } else if (typedTotal) {
      // The admin typed their own total, so it wins and is flagged as set by hand.
      nextTotal = total ?? oldRow.total_amount;
      overridden = nextTotal !== priced.total;
    }
    // Otherwise the total was already set by hand and the admin left it alone, so it stays.
  } else {
    nextTotal = total ?? oldRow.total_amount;
    overridden = oldRow.total_overridden || nextTotal !== oldRow.total_amount;
  }
  const update = {
    guest_name: guestName,
    guest_names: guestNames ?? [],
    phone,
    notes: notes || null,
    adults,
    children,
    corkage_items: corkage.items as unknown as Json,
    total_amount: nextTotal,
    price_breakdown: breakdown,
    total_overridden: overridden,
  };
  const { error } = await admin.supabase.from("bookings").update(update).eq("id", id);
  if (error) redirect("/admin/bookings?error=booking");
  await logChange(admin.supabase, admin.userId, "bookings", id, oldRow as unknown as Json, update as unknown as Json);
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  redirect("/admin/bookings?saved=booking");
}

// Adds days to the end of a room stay when the following days are free. The total grows by the extra days at the booking's own rates.
export async function extendBookingAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");
  const id = readText(formData, "booking_id", 64);
  const extraDays = readInteger(formData, "extra_days");
  if (!id || typeof extraDays !== "number" || extraDays < 1 || extraDays > 14) redirect("/admin/bookings?error=extend");

  await expireUnpaidHolds();
  const { data: booking, error: readError } = await admin.supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (
    readError ||
    !booking ||
    booking.type !== "unit" ||
    (booking.status !== "confirmed" && booking.status !== "awaiting_payment")
  )
    redirect("/admin/bookings?error=extend");

  const newEnd = addDays(booking.date_end, extraDays);
  const [{ data: others }, { data: blocked }] = await Promise.all([
    admin.supabase
      .from("bookings")
      .select("id,type,unit_ids,status,hold_expires_at,date_start,date_end")
      .lte("date_start", newEnd)
      .gte("date_end", addDays(booking.date_end, 1))
      .not("status", "in", "(cancelled,completed)"),
    admin.supabase.from("blocked_dates").select("date").gte("date", addDays(booking.date_end, 1)).lte("date", newEnd),
  ]);
  const check = checkExtension({
    booking,
    extraDays,
    bookings: others ?? [],
    blockedDates: (blocked ?? []).map((row) => row.date),
  });
  if (!check.ok) redirect("/admin/bookings?error=extendConflict");

  const common = {
    adults: booking.adults,
    children: booking.children,
    corkage: normalizeCorkageItems(booking.corkage_items),
    useSnapshot: true,
  };
  const oldDays = dayCount(booking.date_start, booking.date_end);
  const [before, after] = await Promise.all([
    priceBooking(admin.supabase, booking, { ...common, days: oldDays }),
    priceBooking(admin.supabase, booking, { ...common, days: oldDays + extraDays }),
  ]);
  if (!before || !after) redirect("/admin/bookings?error=price");
  const update = {
    date_end: check.newEnd,
    total_amount: Math.round((booking.total_amount + (after.total - before.total)) * 100) / 100,
    price_breakdown: after as unknown as Json,
  };
  const { error } = await admin.supabase.from("bookings").update(update).eq("id", id);
  if (error) redirect(`/admin/bookings?error=${error.code === "23P01" ? "extendConflict" : "extend"}`);
  await logChange(admin.supabase, admin.userId, "bookings", id, booking as unknown as Json, update as unknown as Json);
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  redirect("/admin/bookings?saved=extended");
}
