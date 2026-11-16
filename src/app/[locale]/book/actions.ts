"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAvailabilityWindow } from "@/lib/booking-data";
import { expireUnpaidHolds } from "@/lib/booking-maintenance";
import { sendBookingReceivedEmail } from "@/lib/notifications";

const locales = new Set(["en", "fil", "ceb"]);

function text(form: FormData, key: string, max: number) {
  const value = form.get(key);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function fail(locale: string, reason: string): never {
  const prefix = locale === "en" ? "" : `/${locale}`;
  redirect(`${prefix}/book?error=${reason}#booking-form`);
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T12:00:00Z`))) return false;
  return new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

export async function submitBookingRequest(form: FormData) {
  const requestedLocale = text(form, "locale", 3);
  const locale = locales.has(requestedLocale) ? requestedLocale : "en";
  if (text(form, "website", 200)) fail(locale, "invalid");

  const kind = text(form, "kind", 20);
  const date = text(form, "date", 10);
  const guestName = text(form, "guest_name", 160);
  const phone = text(form, "phone", 40);
  const email = text(form, "guest_email", 254);
  const extraContact = text(form, "contact_extra", 120);
  const notes = text(form, "notes", 1000);
  const adults = Number(text(form, "adults", 6));
  const children = Number(text(form, "children", 6));
  if (!(["exclusive", "unit", "entrance"] as const).includes(kind as "exclusive" | "unit" | "entrance") || !validDate(date) || !guestName || guestName.length > 160 || !/^\+?[0-9 ()-]{7,40}$/.test(phone) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || !Number.isSafeInteger(adults) || adults < 0 || adults > 1000 || !Number.isSafeInteger(children) || children < 0 || children > 1000 || adults + children < 1) {
    fail(locale, "invalid");
  }
  const { start: today, end: latest } = getAvailabilityWindow();
  if (date < today || date > latest) fail(locale, "date");

  await expireUnpaidHolds();
  const supabase = createSupabaseServiceClient();
  const [{ data: settings }, { data: blocked }, { data: existing }] = await Promise.all([
    supabase.from("settings").select("key,value").in("key", ["extra_guest_fee"]),
    supabase.from("blocked_dates").select("date").eq("date", date).maybeSingle(),
    supabase.from("bookings").select("id,type,unit_ids,status,hold_expires_at,date_start,date_end").lte("date_start", date).gte("date_end", date).not("status", "in", "(cancelled,completed)"),
  ]);
  if (blocked) fail(locale, "unavailable");
  const activeBookings = (existing ?? []).filter((booking) => booking.status === "confirmed" || (booking.status === "awaiting_payment" && (!booking.hold_expires_at || new Date(booking.hold_expires_at) > new Date())));
  if (activeBookings.some((booking) => booking.type === "exclusive") || (kind === "exclusive" && activeBookings.length)) fail(locale, "unavailable");

  const packageId = text(form, "package_id", 64) || null;
  const unitId = text(form, "unit_id", 64);
  let total = 0;
  let unitIds: string[] = [];

  if (kind === "exclusive") {
    if (!packageId) fail(locale, "invalid");
    const { data: item } = await supabase.from("packages").select("id,scope,price_amount,pax_included,weekday_only,weekend_only").eq("id", packageId).eq("active", true).maybeSingle();
    if (!item || item.scope !== "exclusive" || item.price_amount === null) fail(locale, "unavailable");
    const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    if ((item.weekday_only && (day === 0 || day === 6)) || (item.weekend_only && day !== 0 && day !== 6)) fail(locale, "unavailable");
    const guestCount = adults + children;
    if (item.pax_included !== null && guestCount > item.pax_included) {
      const extraSetting = settings?.find((setting) => setting.key === "extra_guest_fee")?.value;
      const extraFee = typeof extraSetting === "number" ? extraSetting : null;
      if (extraFee === null) fail(locale, "extraFee");
      total = item.price_amount + (guestCount - item.pax_included) * extraFee;
    } else total = item.price_amount;
  } else if (kind === "unit") {
    if (!unitId) fail(locale, "invalid");
    const { data: unit } = await supabase.from("units").select("id,price_amount,capacity_max,active").eq("id", unitId).maybeSingle();
    if (!unit?.active || unit.price_amount === null || (unit.capacity_max !== null && adults + children > unit.capacity_max)) fail(locale, "unavailable");
    if (activeBookings.some((booking) => booking.unit_ids.includes(unitId))) fail(locale, "unavailable");
    total = unit.price_amount;
    unitIds = [unitId];
  } else {
    const visit = text(form, "visit_type", 20);
    if (visit !== "day-tour" && visit !== "overnight") fail(locale, "invalid");
    const adultSlug = `${visit}-adult`;
    const childSlug = `${visit}-child-5-10`;
    const { data: fees } = await supabase.from("packages").select("slug,price_amount,active").in("slug", [adultSlug, childSlug]);
    const adultFee = fees?.find((fee) => fee.slug === adultSlug && fee.active)?.price_amount;
    const childFee = fees?.find((fee) => fee.slug === childSlug && fee.active)?.price_amount;
    if (adultFee == null || childFee == null) fail(locale, "unavailable");
    total = adults * adultFee + children * childFee;
  }

  const refCode = `NSM-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const authClient = await createSupabaseServerClient();
  let { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    const { data, error: authError } = await authClient.auth.signInAnonymously();
    if (authError || !data.user) fail(locale, "save");
    user = data.user;
  }
  const { data: booking, error } = await supabase.from("bookings").insert({
    ref_code: refCode,
    type: kind as "exclusive" | "unit" | "entrance",
    package_id: kind === "exclusive" ? packageId : null,
    unit_ids: unitIds,
    date_start: date,
    date_end: date,
    adults,
    children,
    guest_name: guestName,
    phone,
    guest_email: email || null,
    contact_extra: extraContact || null,
    notes: notes || null,
    status: "pending",
    total_amount: total,
    deposit_required: null,
    payment_deadline: null,
    hold_expires_at: null,
    guest_uid: user.id,
  }).select("access_token,ref_code,guest_name,guest_email").single();
  if (error || !booking) fail(locale, error?.code === "23P01" ? "unavailable" : "save");
  await sendBookingReceivedEmail(booking, locale);
  const prefix = locale === "en" ? "" : `/${locale}`;
  redirect(`${prefix}/book/confirmation/${booking.access_token}`);
}
