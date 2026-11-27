import Link from "next/link";
import type { Database } from "@/lib/supabase/database.types";
import { addDays, eachDay, isLive } from "@/lib/availability";
import { availabilityCell } from "@/app/admin/_lib/availability-cell";

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

/** Which cottage or room is taken on which day, with the guest's name. Admin only. */
export function AvailabilityGrid({ units, bookings, blockedDates, from, today, span = 14 }: Props) {
  const days = eachDay(from, addDays(from, span - 1));
  const blocked = new Set(blockedDates);
  const now = new Date();
  const live = bookings.filter((booking) => isLive(booking, now));
  const requests = bookings.filter((booking) => booking.status === "pending");
  const dayLabel = new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", timeZone: "UTC" });
  const weekdayLabel = new Intl.DateTimeFormat("en-PH", { weekday: "short", timeZone: "UTC" });
  const previous = addDays(from, -span) < today ? today : addDays(from, -span);

  return (
    <div>
      <div className="admin-grid-toolbar">
        <Link href={`/admin/availability?from=${previous}`} aria-disabled={from <= today}>
          ← Earlier
        </Link>
        <strong>
          {dayLabel.format(new Date(`${from}T12:00:00Z`))} –{" "}
          {dayLabel.format(new Date(`${days[days.length - 1]}T12:00:00Z`))}
        </strong>
        <Link href={`/admin/availability?from=${addDays(from, span)}`}>Later →</Link>
      </div>
      <div className="admin-grid-scroll">
        <table className="admin-grid">
          <thead>
            <tr>
              <th scope="col">Cottage or room</th>
              {days.map((day) => (
                <th scope="col" key={day} className={day === today ? "admin-grid-today" : undefined}>
                  {weekdayLabel.format(new Date(`${day}T12:00:00Z`))}
                  <br />
                  {dayLabel.format(new Date(`${day}T12:00:00Z`))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <tr key={unit.id}>
                <th scope="row">{unit.name}</th>
                {days.map((day) => {
                  const item = availabilityCell(unit, day, { blocked, live, requests });
                  return (
                    <td key={day} className={item.className} title={item.title}>
                      {item.text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="admin-help">
        Green is free. Red is booked, teal is awaiting payment, yellow is a request that has not been approved yet (it
        does not hold the date).
      </p>
    </div>
  );
}
