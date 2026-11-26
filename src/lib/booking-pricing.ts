import type { Database, Json } from "@/lib/supabase/database.types";

// Shared by the admin booking form (live preview), the save action (the authoritative calculation),
// and the receipt page. Keep it free of server-only imports so client components can use it.

export type VisitType = "day-tour" | "overnight";
export type BookingKind = "exclusive" | "unit" | "entrance";

export type ChargeLine = { label: string; detail?: string; quantity: number; unit_price: number; amount: number };

export type PricingCatalog = {
  packages: Array<{ id: string; slug: string; name: string; scope: "exclusive" | "walk-in"; price: number | null; paxIncluded: number | null }>;
  units: Array<{ id: string; name: string; price: number | null }>;
  extraGuestFee: number | null;
};

export type PricingInput = {
  kind: BookingKind;
  packageId: string | null;
  unitId: string | null;
  visitType: VisitType;
  adults: number;
  children: number;
};

export type PricingResult =
  | { ok: true; lines: ChargeLine[]; total: number }
  | { ok: false; lines: []; total: null; missing: string };

type PackageRow = Database["public"]["Tables"]["packages"]["Row"];
type UnitRow = Database["public"]["Tables"]["units"]["Row"];

function englishName(value: Json, fallback: string) {
  if (value && typeof value === "object" && !Array.isArray(value) && typeof value.en === "string") return value.en;
  return fallback;
}

export function catalogFromRows(
  packages: Pick<PackageRow, "id" | "slug" | "name" | "scope" | "price_amount" | "pax_included">[],
  units: Pick<UnitRow, "id" | "name" | "price_amount">[],
  extraGuestFee: Json | null | undefined,
): PricingCatalog {
  return {
    packages: packages.map((item) => ({ id: item.id, slug: item.slug, name: englishName(item.name, item.slug), scope: item.scope, price: item.price_amount, paxIncluded: item.pax_included })),
    units: units.map((item) => ({ id: item.id, name: item.name, price: item.price_amount })),
    extraGuestFee: typeof extraGuestFee === "number" ? extraGuestFee : null,
  };
}

function line(label: string, quantity: number, unitPrice: number, detail?: string): ChargeLine {
  return { label, quantity, unit_price: unitPrice, amount: quantity * unitPrice, ...(detail ? { detail } : {}) };
}

function fail(missing: string): PricingResult {
  return { ok: false, lines: [], total: null, missing };
}

// Mirrors the public booking form so staff and guests are always quoted the same way.
export function calculateCharges(input: PricingInput, catalog: PricingCatalog): PricingResult {
  const guests = input.adults + input.children;
  const lines: ChargeLine[] = [];

  if (input.kind === "exclusive") {
    const item = catalog.packages.find((entry) => entry.id === input.packageId && entry.scope === "exclusive");
    if (!item) return fail("Choose a whole-resort package.");
    if (item.price === null) return fail("This package has no price yet. Type the total yourself.");
    lines.push(line(item.name, 1, item.price, item.paxIncluded !== null ? `Whole resort · ${item.paxIncluded} guests included` : "Whole resort"));
    if (item.paxIncluded !== null && guests > item.paxIncluded) {
      if (catalog.extraGuestFee === null) return fail("The extra guest fee is not set. Add it in Resort settings, or type the total yourself.");
      lines.push(line("Extra guests", guests - item.paxIncluded, catalog.extraGuestFee, `Over the ${item.paxIncluded} included guests`));
    }
  } else if (input.kind === "unit") {
    const unit = catalog.units.find((entry) => entry.id === input.unitId);
    if (!unit) return fail("Choose a cottage or room.");
    if (unit.price === null) return fail("This cottage or room has no price yet. Type the total yourself.");
    lines.push(line(unit.name, 1, unit.price, "Cottage or room"));
  } else {
    const adultRate = catalog.packages.find((entry) => entry.scope === "walk-in" && entry.slug === `${input.visitType}-adult`);
    const childRate = catalog.packages.find((entry) => entry.scope === "walk-in" && entry.slug === `${input.visitType}-child-5-10`);
    if (input.adults > 0) {
      if (!adultRate || adultRate.price === null) return fail("The adult entrance rate is not set. Type the total yourself.");
      lines.push(line(adultRate.name, input.adults, adultRate.price));
    }
    if (input.children > 0) {
      if (!childRate || childRate.price === null) return fail("The child entrance rate is not set. Type the total yourself.");
      lines.push(line(childRate.name, input.children, childRate.price));
    }
    if (lines.length === 0) return fail("Add at least one guest.");
  }

  return { ok: true, lines, total: lines.reduce((sum, entry) => sum + entry.amount, 0) };
}

// Makes the lines add up to the total the staff member actually charged (discount, special rate, or no catalog price).
export function withAdjustment(lines: ChargeLine[], total: number, fallbackLabel: string): ChargeLine[] {
  const sum = lines.reduce((acc, entry) => acc + entry.amount, 0);
  if (lines.length === 0) return [line(fallbackLabel, 1, total, "Agreed amount")];
  if (sum === total) return lines;
  const difference = total - sum;
  return [...lines, line(difference < 0 ? "Discount" : "Additional charge", 1, difference, "Set by the resort")];
}

export function parseLineItems(value: Json | null | undefined): ChargeLine[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || !Array.isArray(value.lines)) return null;
  const parsed: ChargeLine[] = [];
  for (const entry of value.lines) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const { label, detail, quantity, unit_price, amount } = entry;
    if (typeof label !== "string" || typeof quantity !== "number" || typeof unit_price !== "number" || typeof amount !== "number") return null;
    parsed.push({ label, quantity, unit_price, amount, ...(typeof detail === "string" ? { detail } : {}) });
  }
  return parsed.length > 0 ? parsed : null;
}
