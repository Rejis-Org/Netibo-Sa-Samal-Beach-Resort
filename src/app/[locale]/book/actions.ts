"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { getAvailabilityWindow } from "@/lib/booking-data";
import { expireUnpaidHolds } from "@/lib/booking-maintenance";
import { sendBookingReceivedEmail } from "@/lib/notifications";
import { MAX_STAY_DAYS, dayCount, findConflicts } from "@/lib/availability";
import { parseCorkageRows, priceExclusive, priceStay } from "@/lib/pricing";

const locales = new Set(["en", "fil", "ceb"]);
const MAX_UNITS_PER_BOOKING = 10;

function text(form: FormData, key: string, max: number) {
  const value = form.get(key);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function textList(form: FormData, key: string, max: number) {
  return form.getAll(key).map((value) => (typeof value === "string" ? value.trim().slice(0, max) : ""));
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
  // Only cottage/room stays can run several days. Whole-resort and entrance-only requests are always one date.
  const dateEnd = kind === "unit" ? text(form, "date_end", 10) || date : date;
  const guestName = text(form, "guest_name", 160);
  const phone = text(form, "phone", 40);
  const email = text(form, "guest_email", 254);
  const extraContact = text(form, "contact_extra", 120);
  const notes = text(form, "notes", 1000);
  const adults = Number(text(form, "adults", 6));
  const children = Number(text(form, "children", 6));
  if (!(["exclusive", "unit", "entrance"] as const).includes(kind as "exclusive" | "unit" | "entrance") || !validDate(date) || !validDate(dateEnd) || dateEnd < date || !guestName || guestName.length > 160 || !/^\+?[0-9 ()-]{7,40}$/.test(phone) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || !Number.isSafeInteger(adults) || adults < 0 || adults > 1000 || !Number.isSafeInteger(children) || children < 0 || children > 1000 || adults + children < 1) {
    fail(locale, "invalid");
  }
  const { start: today, end: latest } = getAvailabilityWindow();
  if (date < today || dateEnd > latest) fail(locale, "date");
  const days = dayCount(date, dateEnd);
  if (days < 1 || days > MAX_STAY_DAYS) fail(locale, "date");

  const corkage = parseCorkageRows(textList(form, "corkage_label", 200), textList(form, "corkage_amount", 40));
  if (corkage.invalid) fail(locale, "invalid");

  const unitIds = kind === "unit" ? [...new Set(textList(form, "unit_id", 64).filter(Boolean))] : [];
  if (kind === "unit" && (unitIds.length < 1 || unitIds.length > MAX_UNITS_PER_BOOKING)) fail(locale, "invalid");

  await expireUnpaidHolds();
  const supabase = createSupabaseServiceClient();
  const [{ data: settings }, { data: blocked }, { data: existing }] = await Promise.all([
    supabase.from("settings").select("key,value").in("key", ["extra_guest_fee"]),
    supabase.from("blocked_dates").select("date").gte("date", date).lte("date", dateEnd),
    supabase.from("bookings").select("id,type,unit_ids,status,hold_expires_at,date_start,date_end").lte("date_start", dateEnd).gte("date_end", date).not("status", "in", "(cancelled,completed)"),
  ]);
  // The same rules the booking form uses to grey out taken places, so a taken date or place can never slip through.
  const conflicts = findConflicts({
    kind: kind as "exclusive" | "unit" | "entrance",
    start: date,
    end: dateEnd,
    unitIds,
    bookings: existing ?? [],
    blockedDates: (blocked ?? []).map((row) => row.date),
  });
  if (conflicts.length) fail(locale, "unavailable");

  const packageId = text(form, "package_id", 64) || null;
  const visit = text(form, "visit_type", 20);
  let total = 0;
  let breakdown: Json;

  if (kind === "exclusive") {
    if (!packageId) fail(locale, "invalid");
    const { data: item } = await supabase.from("packages").select("id,scope,price_amount,pax_included,weekday_only,weekend_only").eq("id", packageId).eq("active", true).maybeSingle();
    if (!item || item.scope !== "exclusive" || item.price_amount === null) fail(locale, "unavailable");
    const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    if ((item.weekday_only && (day === 0 || day === 6)) || (item.weekend_only && day !== 0 && day !== 6)) fail(locale, "unavailable");
    const extraSetting = settings?.find((setting) => setting.key === "extra_guest_fee")?.value;
    const priced = priceExclusive({
      packagePrice: item.price_amount,
      paxIncluded: item.pax_included,
      extraGuestFee: typeof extraSetting === "number" ? extraSetting : null,
      guests: adults + children,
      corkage: corkage.items,
    });
    if (!priced.ok) fail(locale, priced.reason === "extraFee" ? "extraFee" : "invalid");
    total = priced.breakdown.total;
    breakdown = priced.breakdown as unknown as Json;
  } else {
    if (visit !== "day-tour" && visit !== "overnight") fail(locale, "invalid");
    const adultSlug = `${visit}-adult`;
    const childSlug = `${visit}-child-5-10`;
    const { data: fees } = await supabase.from("packages").select("slug,price_amount,active").in("slug", [adultSlug, childSlug]);
    const adultFee = fees?.find((fee) => fee.slug === adultSlug && fee.active)?.price_amount;
    const childFee = fees?.find((fee) => fee.slug === childSlug && fee.active)?.price_amount;
    if (adultFee == null || childFee == null) fail(locale, "unavailable");

    let stayUnits: { id: string; name: string; price: number; freeEntrances: number }[] = [];
    if (kind === "unit") {
      const { data: rows } = await supabase.from("units").select("id,name,price_amount,capacity_max,active,free_entrance_count").in("id", unitIds);
      const found = rows ?? [];
      if (found.length !== unitIds.length || found.some((unit) => !unit.active || unit.price_amount === null)) fail(locale, "unavailable");
      // Capacity is the combined capacity of the chosen places; skipped when any of them has no stated capacity.
      if (found.every((unit) => unit.capacity_max !== null) && adults + children > found.reduce((sum, unit) => sum + (unit.capacity_max ?? 0), 0)) fail(locale, "unavailable");
      stayUnits = found.map((unit) => ({ id: unit.id, name: unit.name, price: unit.price_amount ?? 0, freeEntrances: unit.free_entrance_count }));
    }
    const priced = priceStay({ days, adults, children, units: stayUnits, adultFee, childFee, corkage: corkage.items });
    if (!priced.ok) fail(locale, "invalid");
    total = priced.breakdown.total;
    breakdown = priced.breakdown as unknown as Json;
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
    date_end: dateEnd,
    adults,
    children,
    guest_name: guestName,
    phone,
    guest_email: email || null,
    contact_extra: extraContact || null,
    notes: notes || null,
    status: "pending",
    total_amount: total,
    visit_type: kind === "exclusive" ? null : (visit as "day-tour" | "overnight"),
    corkage_items: corkage.items as unknown as Json,
    price_breakdown: breakdown,
    total_overridden: false,
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
