import { checkInAction, checkOutAction } from "./actions";

export type LogbookEntry = {
  logId: string;
  guest: string;
  phone: string;
  title: string;
  adults: number;
  children: number;
  checkedInAt: string;
  checkedOutAt: string | null;
  stayEnd: string;
};

export type ExpectedGuest = {
  bookingId: string;
  guest: string;
  phone: string;
  title: string;
  status: string;
  adults: number;
  children: number;
  stayStart: string;
  stayEnd: string;
};

const time = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });
const shortDate = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" });
const label = (date: string) => shortDate.format(new Date(`${date}T12:00:00+08:00`));

/** Who is in the resort right now, who has not arrived yet, and who left today. */
export function Logbook({ inResort, expected, leftToday, today }: { inResort: LogbookEntry[]; expected: ExpectedGuest[]; leftToday: LogbookEntry[]; today: string }) {
  const adults = inResort.reduce((total, entry) => total + entry.adults, 0);
  const children = inResort.reduce((total, entry) => total + entry.children, 0);
  return (
    <div className="admin-booking-list">
      <div className="admin-summary-grid" aria-label="Guests in the resort now">
        <article><span>Parties in the resort</span><strong>{inResort.length}</strong></article>
        <article><span>Adults</span><strong>{adults}</strong></article>
        <article><span>Children</span><strong>{children}</strong></article>
        <article><span>Guests in total</span><strong>{adults + children}</strong></article>
      </div>

      <h3 className="admin-subheading">In the resort now</h3>
      {inResort.length === 0 && <p className="admin-empty-state">Nobody is checked in.</p>}
      {inResort.map((entry) => <article className="admin-booking-card" key={entry.logId}>
        <div className="admin-booking-heading">
          <div><p className="eyebrow">In at {time.format(new Date(entry.checkedInAt))} · stay ends {label(entry.stayEnd)}</p><h3>{entry.guest}</h3><p>{entry.title} · {entry.adults} adults, {entry.children} children</p></div>
          {entry.stayEnd < today ? <span className="admin-flag">Past check-out day</span> : entry.stayEnd === today ? <span className="admin-flag">Leaves today</span> : null}
        </div>
        <div className="admin-booking-details"><a href={`tel:${entry.phone.replace(/[^+\d]/g, "")}`}>{entry.phone}</a></div>
        <form className="admin-booking-actions" action={checkOutAction}><input type="hidden" name="log_id" value={entry.logId} /><button className="button button-outline" type="submit">Check out</button></form>
      </article>)}

      <h3 className="admin-subheading">Booked for today, not checked in yet</h3>
      {expected.length === 0 && <p className="admin-empty-state">Everyone booked for today has checked in.</p>}
      {expected.map((guest) => <article className="admin-booking-card" key={guest.bookingId}>
        <div className="admin-booking-heading">
          <div><p className="eyebrow">{label(guest.stayStart)}{guest.stayEnd !== guest.stayStart ? ` – ${label(guest.stayEnd)}` : ""}</p><h3>{guest.guest}</h3><p>{guest.title}</p></div>
          <span className={`booking-status booking-status-${guest.status}`}>{guest.status.replaceAll("_", " ")}</span>
        </div>
        <form className="admin-booking-extend" action={checkInAction}>
          <input type="hidden" name="booking_id" value={guest.bookingId} />
          <label>Adults <input name="adults" type="number" min={0} max={1000} defaultValue={guest.adults} required /></label>
          <label>Children <input name="children" type="number" min={0} max={1000} defaultValue={guest.children} required /></label>
          <button className="button button-blue" type="submit">Check in</button>
        </form>
      </article>)}

      {leftToday.length > 0 && <>
        <h3 className="admin-subheading">Left today</h3>
        {leftToday.map((entry) => <p className="admin-help" key={entry.logId}>{entry.guest} · {entry.title} · {entry.adults + entry.children} guests · {time.format(new Date(entry.checkedInAt))} to {entry.checkedOutAt ? time.format(new Date(entry.checkedOutAt)) : ""}</p>)}
      </>}
    </div>
  );
}
