import Link from "next/link";
import type { Database } from "@/lib/supabase/database.types";
import { addDays, eachDay, isLive } from "@/lib/availability";

type Unit = Database["public"]["Tables"]["units"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

type Props = {
  units: Unit[];
  bookings: Booking[];
  blockedDates: string[];
  from: string;
  today: string;
  span?: number;
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** Which cottage or room is taken on which day, with the guest's name. Admin only. */
export function AvailabilityGrid({ units, bookings, blockedDates, from, today, span = 14 }: Props) {
  const days = eachDay(from, addDays(from, span - 1));
  const blocked = new Set(blockedDates);
  const now = new Date();
  const live = bookings.filter((booking) => isLive(booking, now));
  const requests = bookings.filter((booking) => booking.status === "pending");
  const covers = (booking: Booking, day: string) => booking.date_start <= day && booking.date_end >= day;
  const dayLabel = new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", timeZone: "UTC" });
  const weekdayLabel = new Intl.DateTimeFormat("en-PH", { weekday: "short", timeZone: "UTC" });
  const previous = addDays(from, -span) < today ? today : addDays(from, -span);

  function cell(unit: Unit, day: string) {
    if (blocked.has(day)) return { className: "admin-cell-closed", text: "Closed", title: "Closed date" };
    const whole = live.find((booking) => booking.type === "exclusive" && covers(booking, day));
    if (whole) return { className: "admin-cell-exclusive", text: "Resort", title: `${whole.guest_name} · ${whole.ref_code} (whole resort)` };
    const own = live.find((booking) => booking.unit_ids.includes(unit.id) && covers(booking, day));
    if (own) return { className: own.status === "confirmed" ? "admin-cell-booked" : "admin-cell-held", text: firstName(own.guest_name), title: `${own.guest_name} · ${own.ref_code} · ${own.status.replaceAll("_", " ")}` };
    const request = requests.find((booking) => booking.unit_ids.includes(unit.id) && covers(booking, day));
    if (request) return { className: "admin-cell-requested", text: "Request", title: `${request.guest_name} · ${request.ref_code} · waiting for approval` };
    return { className: "admin-cell-free", text: "Free", title: "Free" };
  }

  return (
    <div>
      <div className="admin-grid-toolbar">
        <Link href={`/admin?from=${previous}#availability`} aria-disabled={from <= today}>← Earlier</Link>
        <strong>{dayLabel.format(new Date(`${from}T12:00:00Z`))} – {dayLabel.format(new Date(`${days[days.length - 1]}T12:00:00Z`))}</strong>
        <Link href={`/admin?from=${addDays(from, span)}#availability`}>Later →</Link>
      </div>
      <div className="admin-grid-scroll">
        <table className="admin-grid">
          <thead>
            <tr>
              <th scope="col">Cottage or room</th>
              {days.map((day) => <th scope="col" key={day} className={day === today ? "admin-grid-today" : undefined}>{weekdayLabel.format(new Date(`${day}T12:00:00Z`))}<br />{dayLabel.format(new Date(`${day}T12:00:00Z`))}</th>)}
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => <tr key={unit.id}>
              <th scope="row">{unit.name}</th>
              {days.map((day) => {
                const item = cell(unit, day);
                return <td key={day} className={item.className} title={item.title}>{item.text}</td>;
              })}
            </tr>)}
          </tbody>
        </table>
      </div>
      <p className="admin-help">Green is free. Red is booked, teal is awaiting payment, yellow is a request that has not been approved yet (it does not hold the date).</p>
    </div>
  );
}
