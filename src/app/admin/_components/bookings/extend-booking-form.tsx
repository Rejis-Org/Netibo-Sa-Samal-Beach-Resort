import type { Database } from "@/lib/supabase/database.types";
import { extendBookingAction } from "@/app/admin/_actions/bookings";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export function ExtendBookingForm({ booking, maxDays }: { booking: Booking; maxDays: number }) {
  if (maxDays < 1)
    return <p className="admin-help admin-booking-extend">Cannot extend: the next day is already booked or closed.</p>;
  return (
    <form className="admin-booking-extend" action={extendBookingAction}>
      <input type="hidden" name="booking_id" value={booking.id} />
      <label>
        Extend by <input name="extra_days" type="number" min={1} max={maxDays} defaultValue={1} required /> day(s)
      </label>
      <button className="button button-blue" type="submit">
        Extend stay
      </button>
      <span className="admin-help">
        Up to {maxDays} more day{maxDays === 1 ? "" : "s"} free.
      </span>
    </form>
  );
}
