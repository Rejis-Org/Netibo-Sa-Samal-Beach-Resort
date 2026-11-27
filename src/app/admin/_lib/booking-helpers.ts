import type { Database, Json } from "@/lib/supabase/database.types";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

// Shows "cancelled" for approved bookings whose payment deadline has passed, without waiting on the database clean-up.
export function withLiveStatus(rows: BookingRow[]): BookingRow[] {
  const now = Date.now();
  return rows.map((row) =>
    row.status === "awaiting_payment" && row.hold_expires_at && new Date(row.hold_expires_at).getTime() <= now
      ? { ...row, status: "cancelled" as const }
      : row,
  );
}

function packageName(value: Json, fallback: string) {
  return value && typeof value === "object" && !Array.isArray(value) && typeof value.en === "string"
    ? value.en
    : fallback;
}

export function makeBookingTitle(
  packages: { id: string; slug: string; name: Json }[],
  units: { id: string; name: string }[],
) {
  const packageNames = new Map(packages.map((item) => [item.id, packageName(item.name, item.slug)]));
  const unitNames = new Map(units.map((item) => [item.id, item.name]));
  return (booking: BookingRow) =>
    booking.type === "exclusive"
      ? (packageNames.get(booking.package_id ?? "") ?? "Exclusive package")
      : booking.type === "unit"
        ? booking.unit_ids.map((id) => unitNames.get(id) ?? "Stay").join(", ")
        : "Entrance";
}
