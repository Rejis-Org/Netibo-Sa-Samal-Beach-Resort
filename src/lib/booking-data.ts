import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { AppLocale } from "@/i18n/routing";

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
  id: string; name: string; price: number | null; capacityMax: number | null; active: boolean;
};

export type BookingOptions = Awaited<ReturnType<typeof getBookingOptions>>;

export async function getBookingOptions(locale: AppLocale) {
  const supabase = createSupabasePublicClient();
  if (!supabase) return null;
  const [packageResult, unitResult, feeResult] = await Promise.all([
    supabase.from("packages").select("id,slug,name,scope,price_amount,pax_included,weekday_only,weekend_only").eq("active", true).order("sort_order"),
    supabase.from("units").select("id,name,price_amount,capacity_max,active").eq("active", true).order("sort_order"),
    supabase.from("settings").select("value").eq("key", "extra_guest_fee").maybeSingle(),
  ]);
  if (packageResult.error || unitResult.error || feeResult.error) return null;
  const feeValue = feeResult.data?.value;
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
    })),
    extraGuestFee: typeof feeValue === "number" ? feeValue : null,
  };
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

export function getAvailabilityWindow() {
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 12);
  return { start: toDateInput(start), end: toDateInput(end) };
}

export function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
