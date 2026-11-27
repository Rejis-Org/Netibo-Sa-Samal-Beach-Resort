import Link from "next/link";
import { sectionHref } from "@/app/admin/_lib/admin-sections";
import type { makeBookingTitle } from "@/app/admin/_lib/booking-helpers";
import { formatDate, peso } from "@/app/admin/_lib/format";
import type { Database } from "@/lib/supabase/database.types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

type PendingPanelProps = { pendingBookings: Booking[]; bookingTitle: ReturnType<typeof makeBookingTitle> };

export function PendingPanel({ pendingBookings, bookingTitle }: PendingPanelProps) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <h2>Needs your approval</h2>
        <Link href={sectionHref("bookings")}>View all</Link>
      </div>
      {pendingBookings.length === 0 && (
        <p className="admin-empty-state">No pending requests. You&apos;re all caught up.</p>
      )}
      <ul className="admin-mini-list">
        {pendingBookings.slice(0, 5).map((booking) => (
          <li key={booking.id}>
            <div>
              <strong>{booking.guest_name}</strong>
              <span>
                {bookingTitle(booking)} · {formatDate(booking.date_start)}
              </span>
            </div>
            <b>{peso.format(booking.total_amount)}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}
