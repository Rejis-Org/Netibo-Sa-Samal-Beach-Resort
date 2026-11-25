// Server-side pricing for existing bookings (editing a booking, extending a stay).
// It builds the inputs for the pure functions in pricing.ts, either from the booking's saved price
// snapshot (so old prices stay old) or from the current catalog (when the admin asks to recalculate).
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";
import { dayCount } from "@/lib/availability";
import { priceExclusive, priceStay, type CorkageItem, type PriceBreakdown } from "@/lib/pricing";

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

export type PriceableBooking = Pick<BookingRow, "type" | "package_id" | "unit_ids" | "date_start" | "date_end" | "visit_type" | "price_breakdown">;

type StayInputs = {
  units: { id: string; name: string; price: number; freeEntrances: number }[];
  adultFee: number;
  childFee: number;
};
type ExclusiveInputs = { packagePrice: number; paxIncluded: number | null; extraGuestFee: number | null };

const record = (value: Json | null | undefined): Record<string, Json | undefined> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value : null;

function readStaySnapshot(value: Json | null): StayInputs | null {
  const snapshot = record(value);
  if (!snapshot || snapshot.kind !== "stay" || typeof snapshot.adultFee !== "number" || typeof snapshot.childFee !== "number" || !Array.isArray(snapshot.unitLines)) return null;
  const units: StayInputs["units"] = [];
  for (const line of snapshot.unitLines) {
    const item = record(line);
    if (!item || typeof item.unitId !== "string" || typeof item.name !== "string" || typeof item.pricePerDay !== "number" || typeof item.freeEntrances !== "number") return null;
    units.push({ id: item.unitId, name: item.name, price: item.pricePerDay, freeEntrances: item.freeEntrances });
  }
  return { units, adultFee: snapshot.adultFee, childFee: snapshot.childFee };
}

function readExclusiveSnapshot(value: Json | null): ExclusiveInputs | null {
  const snapshot = record(value);
  if (!snapshot || snapshot.kind !== "exclusive" || typeof snapshot.packagePrice !== "number") return null;
  const pax = snapshot.paxIncluded;
  const fee = snapshot.extraGuestFee;
  return {
    packagePrice: snapshot.packagePrice,
    paxIncluded: typeof pax === "number" ? pax : null,
    extraGuestFee: typeof fee === "number" ? fee : null,
  };
}

async function currentStayInputs(supabase: Client, booking: PriceableBooking): Promise<StayInputs | null> {
  const visit = booking.visit_type ?? "day-tour";
  const adultSlug = `${visit}-adult`;
  const childSlug = `${visit}-child-5-10`;
  const { data: fees } = await supabase.from("packages").select("slug,price_amount").in("slug", [adultSlug, childSlug]);
  const adultFee = fees?.find((fee) => fee.slug === adultSlug)?.price_amount;
  const childFee = fees?.find((fee) => fee.slug === childSlug)?.price_amount;
  if (adultFee == null || childFee == null) return null;
  const units: StayInputs["units"] = [];
  if (booking.type === "unit" && booking.unit_ids.length) {
    const { data: rows } = await supabase.from("units").select("id,name,price_amount,free_entrance_count").in("id", booking.unit_ids);
    if (!rows || rows.length !== booking.unit_ids.length || rows.some((row) => row.price_amount === null)) return null;
    for (const row of rows) units.push({ id: row.id, name: row.name, price: row.price_amount ?? 0, freeEntrances: row.free_entrance_count });
  }
  return { units, adultFee, childFee };
}

async function currentExclusiveInputs(supabase: Client, booking: PriceableBooking): Promise<ExclusiveInputs | null> {
  if (!booking.package_id) return null;
  const [{ data: item }, { data: setting }] = await Promise.all([
    supabase.from("packages").select("price_amount,pax_included").eq("id", booking.package_id).maybeSingle(),
    supabase.from("settings").select("value").eq("key", "extra_guest_fee").maybeSingle(),
  ]);
  if (!item || item.price_amount === null) return null;
  return { packagePrice: item.price_amount, paxIncluded: item.pax_included, extraGuestFee: typeof setting?.value === "number" ? setting.value : null };
}

/**
 * Prices an existing booking. With useSnapshot the booking's saved rates are reused (falling back to the
 * current catalog for older bookings that have no snapshot); without it everything comes from today's prices.
 * Returns null when a price needed for the calculation is missing.
 */
export async function priceBooking(
  supabase: Client,
  booking: PriceableBooking,
  input: { adults: number; children: number; corkage: CorkageItem[]; days?: number; useSnapshot: boolean },
): Promise<PriceBreakdown | null> {
  const { adults, children, corkage, useSnapshot } = input;
  if (booking.type === "exclusive") {
    const inputs = (useSnapshot ? readExclusiveSnapshot(booking.price_breakdown) : null) ?? await currentExclusiveInputs(supabase, booking);
    if (!inputs) return null;
    const priced = priceExclusive({ ...inputs, guests: adults + children, corkage });
    return priced.ok ? priced.breakdown : null;
  }
  const inputs = (useSnapshot ? readStaySnapshot(booking.price_breakdown) : null) ?? await currentStayInputs(supabase, booking);
  if (!inputs) return null;
  const days = input.days ?? dayCount(booking.date_start, booking.date_end);
  const priced = priceStay({ days, adults, children, units: inputs.units, adultFee: inputs.adultFee, childFee: inputs.childFee, corkage });
  return priced.ok ? priced.breakdown : null;
}
