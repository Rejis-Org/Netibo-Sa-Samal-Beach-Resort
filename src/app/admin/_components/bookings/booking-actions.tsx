import type { Database } from "@/lib/supabase/database.types";
import { updateBookingStatusAction } from "@/app/admin/_actions/bookings";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export function BookingActions({ booking }: { booking: Booking }) {
  return (
    <form className="admin-booking-actions" action={updateBookingStatusAction}>
      <input type="hidden" name="booking_id" value={booking.id} />
      {booking.status === "pending" && (
        <>
          <button className="button button-blue" name="booking_action" value="approve">
            Approve
          </button>
          <button className="button button-outline" name="booking_action" value="decline">
            Decline
          </button>
        </>
      )}
      {booking.status === "awaiting_payment" && (
        <>
          <button className="button button-blue" name="booking_action" value="paid">
            Mark paid
          </button>
          <button className="button button-outline" name="booking_action" value="cancel">
            Cancel
          </button>
        </>
      )}
      {booking.status === "confirmed" && (
        <>
          <button className="button button-blue" name="booking_action" value="complete">
            Complete
          </button>
          <button className="button button-outline" name="booking_action" value="cancel">
            Cancel
          </button>
        </>
      )}
    </form>
  );
}
