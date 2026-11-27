import type { Database } from "@/lib/supabase/database.types";
import { formatFullDate } from "@/app/admin/_lib/format";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

const statusLabels: Record<string, string> = {
  pending: "Pending approval",
  awaiting_payment: "Approved, awaiting payment",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

export function ReceiptMeta({ booking, bookedName }: { booking: Booking; bookedName: string }) {
  const guestCount = booking.adults + booking.children;
  return (
    <dl className="receipt-meta">
      <div>
        <dt>Guest</dt>
        <dd>{booking.guest_name}</dd>
      </div>
      <div>
        <dt>Phone</dt>
        <dd>{booking.phone}</dd>
      </div>
      <div>
        <dt>Booking date</dt>
        <dd>{formatFullDate(booking.date_start)}</dd>
      </div>
      <div>
        <dt>Booked</dt>
        <dd>{bookedName}</dd>
      </div>
      <div>
        <dt>Guests</dt>
        <dd>
          {booking.adults} adult{booking.adults === 1 ? "" : "s"}
          {booking.children > 0
            ? `, ${booking.children} child${booking.children === 1 ? "" : "ren"} (5–10)`
            : ""} · {guestCount} total
        </dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>{statusLabels[booking.status] ?? booking.status}</dd>
      </div>
    </dl>
  );
}
