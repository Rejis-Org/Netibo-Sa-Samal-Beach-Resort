import Link from "next/link";
import { sectionHref } from "@/app/admin/_lib/admin-sections";
import type { makeBookingTitle } from "@/app/admin/_lib/booking-helpers";
import { formatDate } from "@/app/admin/_lib/format";
import type { Database } from "@/lib/supabase/database.types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

type UpcomingPanelProps = { upcoming: Booking[]; bookingTitle: ReturnType<typeof makeBookingTitle> };

export function UpcomingPanel({ upcoming, bookingTitle }: UpcomingPanelProps) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <h2>Coming up</h2>
        <Link href={sectionHref("bookings")}>View all</Link>
      </div>
      {upcoming.length === 0 && <p className="admin-empty-state">No upcoming bookings yet.</p>}
      <ul className="admin-mini-list">
        {upcoming.slice(0, 5).map((booking) => (
          <li key={booking.id}>
            <div>
              <strong>{booking.guest_name}</strong>
              <span>
                {bookingTitle(booking)} · {formatDate(booking.date_start)}
              </span>
            </div>
            <span className={`booking-status booking-status-${booking.status}`}>
              {booking.status.replaceAll("_", " ")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
