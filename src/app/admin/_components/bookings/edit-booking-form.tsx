import type { Database } from "@/lib/supabase/database.types";
import { normalizeCorkageItems } from "@/lib/pricing";
import { editBookingAction } from "@/app/admin/_actions/bookings";
import { CorkageRows, corkageRows } from "./corkage-rows";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export function EditBookingForm({ booking }: { booking: Booking }) {
  return (
    <details className="admin-edit-card admin-booking-edit">
      <summary>
        <span>Edit details and price</span>
        <span>{booking.total_overridden ? "Total set by hand" : "Total from price list"}</span>
      </summary>
      <form action={editBookingAction} className="admin-form admin-editor-form">
        <input type="hidden" name="booking_id" value={booking.id} />
        <label>
          Guest name
          <input name="guest_name" required maxLength={160} defaultValue={booking.guest_name} />
        </label>
        <label>
          Phone
          <input name="phone" type="tel" required maxLength={40} defaultValue={booking.phone} />
        </label>
        <label>
          Adults
          <input name="adults" type="number" min={0} max={1000} required defaultValue={booking.adults} />
        </label>
        <label>
          Children ages 5–10
          <input name="children" type="number" min={0} max={1000} required defaultValue={booking.children} />
        </label>
        <CorkageRows
          help="Corkage items and fees. Leave a row blank to skip it."
          labelPlaceholder="Item"
          rows={corkageRows(normalizeCorkageItems(booking.corkage_items))}
        />

        <label>
          Total (PHP)
          <input name="total" type="number" min={0} step="0.01" defaultValue={booking.total_amount} />
        </label>
        <label className="admin-checkbox">
          <input name="recalc" type="checkbox" />
          Recalculate the total from today&apos;s prices (ignores the total typed here)
        </label>
        <label className="admin-field-wide">
          Notes
          <textarea name="notes" rows={2} maxLength={1000} defaultValue={booking.notes ?? ""} />
        </label>
        <button className="button button-blue admin-field-wide" type="submit">
          Save changes
        </button>
      </form>
    </details>
  );
}
