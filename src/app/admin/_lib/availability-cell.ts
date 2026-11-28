import type { Database } from "@/lib/supabase/database.types";

type Unit = Database["public"]["Tables"]["units"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export type AvailabilityKind = "free" | "booked" | "held" | "exclusive" | "requested" | "closed";

export type AvailabilityCell = { kind: AvailabilityKind; className: string; text: string; title: string };

type CellContext = { blocked: Set<string>; live: Booking[]; requests: Booking[] };

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

const covers = (booking: Booking, day: string) => booking.date_start <= day && booking.date_end >= day;

export function availabilityCell(unit: Unit, day: string, { blocked, live, requests }: CellContext): AvailabilityCell {
  if (blocked.has(day))
    return { kind: "closed", className: "admin-cell-closed", text: "Closed", title: "Closed date" };
  const whole = live.find((booking) => booking.type === "exclusive" && covers(booking, day));
  if (whole)
    return {
      kind: "exclusive",
      className: "admin-cell-exclusive",
      text: "Resort",
      title: `${whole.guest_name} · ${whole.ref_code} (whole resort)`,
    };
  const own = live.find((booking) => booking.unit_ids.includes(unit.id) && covers(booking, day));
  if (own) {
    const confirmed = own.status === "confirmed";
    return {
      kind: confirmed ? "booked" : "held",
      className: confirmed ? "admin-cell-booked" : "admin-cell-held",
      text: firstName(own.guest_name),
      title: `${own.guest_name} · ${own.ref_code} · ${own.status.replaceAll("_", " ")}`,
    };
  }
  const request = requests.find((booking) => booking.unit_ids.includes(unit.id) && covers(booking, day));
  if (request)
    return {
      kind: "requested",
      className: "admin-cell-requested",
      text: "Request",
      title: `${request.guest_name} · ${request.ref_code} · waiting for approval`,
    };
  return { kind: "free", className: "admin-cell-free", text: "Free", title: "Free" };
}
