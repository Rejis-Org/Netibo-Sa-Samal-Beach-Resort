import Link from "next/link";
import { BookingActions } from "@/app/admin/_components/bookings/booking-actions";
import { EditBookingForm } from "@/app/admin/_components/bookings/edit-booking-form";
import { ExtendBookingForm } from "@/app/admin/_components/bookings/extend-booking-form";
import { breakdownSummary } from "@/app/admin/_components/bookings/breakdown-summary";
import type { makeBookingTitle } from "@/app/admin/_lib/booking-helpers";
import { formatDate, peso } from "@/app/admin/_lib/format";
import { maxExtensionDays } from "@/lib/availability";
import type { Database } from "@/lib/supabase/database.types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

type BookingCardProps = {
  booking: Booking;
  bookingTitle: ReturnType<typeof makeBookingTitle>;
  today: string;
  openBookings: Booking[];
  closedDates: string[];
};

export function BookingCard({ booking, bookingTitle, today, openBookings, closedDates }: BookingCardProps) {
  const date =
    booking.date_end > booking.date_start
      ? `${formatDate(booking.date_start)} – ${formatDate(booking.date_end)}`
      : formatDate(booking.date_start);
  const canExtend =
    booking.type === "unit" &&
    (booking.status === "confirmed" || booking.status === "awaiting_payment") &&
    booking.date_end >= today;
  const extendDays = canExtend ? maxExtensionDays({ booking, bookings: openBookings, blockedDates: closedDates }) : 0;
  const summary = breakdownSummary(booking.price_breakdown);
  return (
    <article className="admin-booking-card">
      <div className="admin-booking-heading">
        <div>
          <p className="eyebrow">
            {booking.ref_code} · {date}
          </p>
          <h3>{booking.guest_name}</h3>
          <p>
            {bookingTitle(booking)} · {booking.adults + booking.children} guests
          </p>
        </div>
        <span className={`booking-status booking-status-${booking.status}`}>{booking.status.replaceAll("_", " ")}</span>
      </div>
      <div className="admin-booking-details">
        <a href={`tel:${booking.phone.replace(/[^+\d]/g, "")}`}>{booking.phone}</a>
        {booking.guest_email && <a href={`mailto:${booking.guest_email}`}>{booking.guest_email}</a>}
        <strong>{peso.format(booking.total_amount)}</strong>
        <Link className="admin-receipt-link" href={`/admin/receipt/${booking.id}`} target="_blank">
          View receipt
        </Link>
      </div>
      {booking.notes && <p className="admin-booking-notes">{booking.notes}</p>}
      {summary && (
        <p className="admin-help">
          {summary}
          {booking.total_overridden && (
            <>
              {" "}
              · <span className="admin-flag">Total set by hand</span>
            </>
          )}
        </p>
      )}
      {booking.deposit_required !== null && (
        <p className="admin-help">
          Deposit requested: ₱{booking.deposit_required.toLocaleString("en-PH")} · Deadline{" "}
          {booking.payment_deadline ? new Date(booking.payment_deadline).toLocaleString("en-PH") : "not set"}
        </p>
      )}
      <BookingActions booking={booking} />
      {canExtend && <ExtendBookingForm booking={booking} maxDays={extendDays} />}
      <EditBookingForm booking={booking} />
    </article>
  );
}
