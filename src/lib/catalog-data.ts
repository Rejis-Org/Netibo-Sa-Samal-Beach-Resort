import type { AppLocale } from "@/i18n/routing";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { exclusivePackages as fallbackPackages, entranceFees as fallbackFees } from "./catalog";

type Localized = Record<string, unknown>;
type PublicPackage = {
  slug: string; name: unknown; scope: "exclusive" | "walk-in"; price_amount: number | null;
  pax_included: number | null; weekday_only: boolean; weekend_only: boolean; notes: unknown;
};
type EntranceFee = { name: string; adultPrice: number | null; childPrice: number | null };
export type PublicUnit = {
  slug: string;
  name: string;
  capacity: string | null;
  price: number | null;
  features: ("aircon" | "ownCr")[];
  photos: string[];
};

function localized(value: unknown, locale: AppLocale) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const content = value as Localized;
    const selected = content[locale] ?? content.en;
    return typeof selected === "string" ? selected : "";
  }
  return typeof value === "string" ? value : "";
}

function fallbackCatalog() {
  return { packages: [...fallbackPackages], entranceFees: [...fallbackFees], units: [] as PublicUnit[], source: "fallback" as const };
}

function unavailableCatalog() {
  return { packages: [], entranceFees: [], units: [] as PublicUnit[], source: "error" as const };
}

export async function getPublicCatalog(locale: AppLocale) {
  const supabase = createSupabasePublicClient();
  if (!supabase) return fallbackCatalog();

  try {
    const [unitResult, packageResult] = await Promise.all([
      supabase.from("units").select("*").eq("active", true).order("sort_order"),
      supabase.from("packages").select("*").eq("active", true).order("sort_order"),
    ]);

    if (unitResult.error || packageResult.error) return unavailableCatalog();
    const units: PublicUnit[] = (unitResult.data ?? []).map((unit) => ({
      slug: unit.slug,
      name: unit.name,
      capacity: unit.capacity_min === null && unit.capacity_max === null
        ? null
        : unit.capacity_min === unit.capacity_max
          ? String(unit.capacity_max)
          : `${unit.capacity_min ?? 0}–${unit.capacity_max ?? unit.capacity_min}`,
      price: unit.price_amount,
      features: [
        ...(unit.aircon ? ["aircon" as const] : []),
        ...(unit.has_own_cr ? ["ownCr" as const] : []),
      ],
      photos: Array.isArray(unit.photos)
        ? (unit.photos as unknown[]).filter((src): src is string => typeof src === "string" && src.length > 0)
        : [],
    }));
    const packages = (packageResult.data ?? []) as PublicPackage[];
    const exclusive = packages
      .filter((item) => item.scope === "exclusive")
      .map((item) => ({
        name: localized(item.name, locale),
        price: item.price_amount,
        included: item.pax_included,
        days: item.weekday_only ? "weekday" : item.weekend_only ? "weekend" : "any",
        notes: localized(item.notes, locale),
      }));
    const findPrice = (slug: string) => packages.find((item) => item.slug === slug)?.price_amount;
    const dayAdult = findPrice("day-tour-adult");
    const dayChild = findPrice("day-tour-child-5-10");
    const overnightAdult = findPrice("overnight-adult");
    const overnightChild = findPrice("overnight-child-5-10");
    const entranceFees: EntranceFee[] = [];
    if (dayAdult !== undefined || dayChild !== undefined) entranceFees.push({ name: "Day tour", adultPrice: dayAdult ?? null, childPrice: dayChild ?? null });
    if (overnightAdult !== undefined || overnightChild !== undefined) entranceFees.push({ name: "Overnight", adultPrice: overnightAdult ?? null, childPrice: overnightChild ?? null });

    return { packages: exclusive, entranceFees, units, source: "database" as const };
  } catch {
    return unavailableCatalog();
  }
}
