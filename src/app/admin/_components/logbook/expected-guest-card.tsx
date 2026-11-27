import { checkInAction } from "@/app/admin/_actions/logbook";
import { formatShortDate } from "@/app/admin/_lib/format";
import type { ExpectedGuest } from "@/app/admin/_lib/logbook-entries";

export function ExpectedGuestCard({ guest }: { guest: ExpectedGuest }) {
  return (
    <article className="admin-booking-card">
      <div className="admin-booking-heading">
        <div>
          <p className="eyebrow">
            {formatShortDate(guest.stayStart)}
            {guest.stayEnd !== guest.stayStart ? ` – ${formatShortDate(guest.stayEnd)}` : ""}
          </p>
          <h3>{guest.guest}</h3>
          <p>{guest.title}</p>
        </div>
        <span className={`booking-status booking-status-${guest.status}`}>{guest.status.replaceAll("_", " ")}</span>
      </div>
      <form className="admin-booking-extend" action={checkInAction}>
        <input type="hidden" name="booking_id" value={guest.bookingId} />
        <label>
          Adults <input name="adults" type="number" min={0} max={1000} defaultValue={guest.adults} required />
        </label>
        <label>
          Children <input name="children" type="number" min={0} max={1000} defaultValue={guest.children} required />
        </label>
        <button className="button button-blue" type="submit">
          Check in
        </button>
      </form>
    </article>
  );
}
