import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { AppLocale } from "@/i18n/routing";
import { normalizeCorkageItems, type VisitType } from "@/lib/pricing";
import type { UnitAvailabilityRow } from "@/lib/availability";

type JsonRecord = Record<string, unknown>;

function localized(value: unknown, locale: AppLocale) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as JsonRecord;
    const text = record[locale] ?? record.en;
    return typeof text === "string" ? text : "";
  }
  return typeof value === "string" ? value : "";
}

export type BookingPackageOption = {
  id: string; slug: string; name: string; scope: "exclusive" | "walk-in";
  price: number | null; paxIncluded: number | null; weekdayOnly: boolean; weekendOnly: boolean;
};

export type BookingUnitOption = {
  id: string; name: string; price: number | null; capacityMax: number | null; active: boolean; freeEntranceCount: number;
};

export type EntranceFees = Record<VisitType, { adult: number | null; child: number | null }>;

export type BookingOptions = Awaited<ReturnType<typeof getBookingOptions>>;

export async function getBookingOptions(locale: AppLocale) {
  const supabase = createSupabasePublicClient();
  if (!supabase) return null;
  const [packageResult, unitResult, settingsResult] = await Promise.all([
    supabase.from("packages").select("id,slug,name,scope,price_amount,pax_included,weekday_only,weekend_only").eq("active", true).order("sort_order"),
    supabase.from("units").select("id,name,price_amount,capacity_max,active,free_entrance_count").eq("active", true).order("sort_order"),
    supabase.from("settings").select("key,value").in("key", ["extra_guest_fee", "corkage_presets"]),
  ]);
  if (packageResult.error || unitResult.error || settingsResult.error) return null;
  const settingValue = (key: string) => settingsResult.data?.find((row) => row.key === key)?.value;
  const feeValue = settingValue("extra_guest_fee");
  const packageRows = packageResult.data ?? [];
  const slugPrice = (slug: string) => packageRows.find((item) => item.slug === slug)?.price_amount ?? null;
  const entranceFees: EntranceFees = {
    "day-tour": { adult: slugPrice("day-tour-adult"), child: slugPrice("day-tour-child-5-10") },
    overnight: { adult: slugPrice("overnight-adult"), child: slugPrice("overnight-child-5-10") },
  };
  return {
    packages: (packageResult.data ?? []).map((item) => ({
      id: item.id,
      slug: item.slug,
      name: localized(item.name, locale),
      scope: item.scope,
      price: item.price_amount,
      paxIncluded: item.pax_included,
      weekdayOnly: item.weekday_only,
      weekendOnly: item.weekend_only,
    })),
    units: (unitResult.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price_amount,
      capacityMax: item.capacity_max,
      active: item.active,
      freeEntranceCount: item.free_entrance_count,
    })),
    extraGuestFee: typeof feeValue === "number" ? feeValue : null,
    entranceFees,
    corkagePresets: normalizeCorkageItems(settingValue("corkage_presets")),
  };
}

/** Which units are taken on which days (booked, whole-resort event, or closed). Units with no row are free that day. */
export async function getUnitAvailability(start: string, end: string): Promise<UnitAvailabilityRow[] | null> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_unit_availability", { from_date: start, through_date: end });
  if (error || !data) return null;
  return data;
}

export type AvailabilityDay = { date: string; state: "closed" | "exclusive" | "partial" };

export async function getPublicAvailability(start: string, end: string) {
  const supabase = createSupabasePublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_public_availability", { from_date: start, through_date: end });
  if (error || !data) return null;
  return (data as unknown as Array<{ day?: string; date?: string; state?: string; reason?: string }>).flatMap((item) => {
    const date = item.day ?? item.date;
    const rawState = item.state ?? item.reason;
    const state = rawState === "exclusive_event" ? "exclusive" : rawState;
    if (!date || (state !== "closed" && state !== "exclusive" && state !== "partial")) return [];
    return [{ date, state: state as AvailabilityDay["state"] }];
  });
}

// All resort dates are Philippine dates, whatever time zone the server runs in.
export function manilaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function addMonths(value: string, months: number) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + months, day, 12)).toISOString().slice(0, 10);
}

export function getAvailabilityWindow() {
  const start = manilaToday();
  return { start, end: addMonths(start, 12) };
}

export function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
