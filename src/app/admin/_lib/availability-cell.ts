import type { Database } from "@/lib/supabase/database.types";

type Unit = Database["public"]["Tables"]["units"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export type AvailabilityCell = { className: string; text: string; title: string };

type CellContext = { blocked: Set<string>; live: Booking[]; requests: Booking[] };

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

const covers = (booking: Booking, day: string) => booking.date_start <= day && booking.date_end >= day;

export function availabilityCell(unit: Unit, day: string, { blocked, live, requests }: CellContext): AvailabilityCell {
  if (blocked.has(day)) return { className: "admin-cell-closed", text: "Closed", title: "Closed date" };
  const whole = live.find((booking) => booking.type === "exclusive" && covers(booking, day));
  if (whole)
    return {
      className: "admin-cell-exclusive",
      text: "Resort",
      title: `${whole.guest_name} · ${whole.ref_code} (whole resort)`,
    };
  const own = live.find((booking) => booking.unit_ids.includes(unit.id) && covers(booking, day));
  if (own)
    return {
      className: own.status === "confirmed" ? "admin-cell-booked" : "admin-cell-held",
      text: firstName(own.guest_name),
      title: `${own.guest_name} · ${own.ref_code} · ${own.status.replaceAll("_", " ")}`,
    };
  const request = requests.find((booking) => booking.unit_ids.includes(unit.id) && covers(booking, day));
  if (request)
    return {
      className: "admin-cell-requested",
      text: "Request",
      title: `${request.guest_name} · ${request.ref_code} · waiting for approval`,
    };
  return { className: "admin-cell-free", text: "Free", title: "Free" };
}
