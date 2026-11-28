import { MotionPillLink } from "@/app/admin/_components/ui/motion-pill-link";
import {
  Ban,
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Hourglass,
  Info,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";
import { addDays, eachDay, isLive } from "@/lib/availability";
import { availabilityCell, type AvailabilityKind } from "@/app/admin/_lib/availability-cell";

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

const kindIcon: Record<AvailabilityKind, LucideIcon> = {
  free: Check,
  booked: UserRound,
  held: Clock,
  exclusive: Building2,
  requested: Hourglass,
  closed: Ban,
};

const legend: { kind: AvailabilityKind; className: string; label: string; note: string }[] = [
  { kind: "free", className: "admin-cell-free", label: "Free", note: "Open for booking" },
  { kind: "booked", className: "admin-cell-booked", label: "Booked", note: "Confirmed guest" },
  { kind: "held", className: "admin-cell-held", label: "Awaiting payment", note: "Date is held" },
  { kind: "requested", className: "admin-cell-requested", label: "Request", note: "Not approved yet, date not held" },
  { kind: "exclusive", className: "admin-cell-exclusive", label: "Whole resort", note: "Exclusive booking" },
  { kind: "closed", className: "admin-cell-closed", label: "Closed", note: "Blocked by admin" },
];

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
  const atStart = from <= today;

  return (
    <div className="admin-grid-wrap">
      <div className="admin-grid-toolbar">
        <MotionPillLink href={`/admin/availability?from=${previous}`} className="admin-grid-nav" disabled={atStart}>
          <ChevronLeft size={16} aria-hidden="true" />
          Earlier
        </MotionPillLink>
        <strong className="admin-grid-range">
          <CalendarDays size={16} aria-hidden="true" />
          {dayLabel.format(new Date(`${from}T12:00:00Z`))} –{" "}
          {dayLabel.format(new Date(`${days[days.length - 1]}T12:00:00Z`))}
        </strong>
        <MotionPillLink href={`/admin/availability?from=${addDays(from, span)}`} className="admin-grid-nav">
          Later
          <ChevronRight size={16} aria-hidden="true" />
        </MotionPillLink>
      </div>
      <div className="admin-grid-scroll">
        <table className="admin-grid">
          <thead>
            <tr>
              <th scope="col">Cottage or room</th>
              {days.map((day) => (
                <th scope="col" key={day} className={day === today ? "admin-grid-today" : undefined}>
                  <span className="admin-grid-weekday">{weekdayLabel.format(new Date(`${day}T12:00:00Z`))}</span>
                  <span className="admin-grid-date">{dayLabel.format(new Date(`${day}T12:00:00Z`))}</span>
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
                  const Icon = kindIcon[item.kind];
                  return (
                    <td key={day} className={item.className} title={item.title}>
                      <span className="admin-cell-inner">
                        <Icon size={13} aria-hidden="true" />
                        <span>{item.text}</span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <aside className="admin-grid-legend" aria-label="Availability legend">
        <p className="admin-grid-legend-title">
          <Info size={16} aria-hidden="true" />
          How to read this table
        </p>
        <ul>
          {legend.map((item) => {
            const Icon = kindIcon[item.kind];
            return (
              <li key={item.kind}>
                <span className={`admin-legend-swatch ${item.className}`}>
                  <Icon size={13} aria-hidden="true" />
                </span>
                <span>
                  <strong>{item.label}</strong> · {item.note}
                </span>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}
