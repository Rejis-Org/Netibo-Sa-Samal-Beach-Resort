import { ExpectedGuestCard } from "@/app/admin/_components/logbook/expected-guest-card";
import { InResortCard } from "@/app/admin/_components/logbook/in-resort-card";
import { formatTime } from "@/app/admin/_lib/format";
import type { ExpectedGuest, LogbookEntry } from "@/app/admin/_lib/logbook-entries";

/** Who is in the resort right now, who has not arrived yet, and who left today. */
export function Logbook({
  inResort,
  expected,
  leftToday,
  today,
}: {
  inResort: LogbookEntry[];
  expected: ExpectedGuest[];
  leftToday: LogbookEntry[];
  today: string;
}) {
  const adults = inResort.reduce((total, entry) => total + entry.adults, 0);
  const children = inResort.reduce((total, entry) => total + entry.children, 0);
  return (
    <div className="admin-booking-list">
      <div className="admin-summary-grid" aria-label="Guests in the resort now">
        <article>
          <span>Parties in the resort</span>
          <strong>{inResort.length}</strong>
        </article>
        <article>
          <span>Adults</span>
          <strong>{adults}</strong>
        </article>
        <article>
          <span>Children</span>
          <strong>{children}</strong>
        </article>
        <article>
          <span>Guests in total</span>
          <strong>{adults + children}</strong>
        </article>
      </div>

      <h3 className="admin-subheading">In the resort now</h3>
      {inResort.length === 0 && <p className="admin-empty-state">Nobody is checked in.</p>}
      {inResort.map((entry) => (
        <InResortCard key={entry.logId} entry={entry} today={today} />
      ))}

      <h3 className="admin-subheading">Booked for today, not checked in yet</h3>
      {expected.length === 0 && <p className="admin-empty-state">Everyone booked for today has checked in.</p>}
      {expected.map((guest) => (
        <ExpectedGuestCard key={guest.bookingId} guest={guest} />
      ))}

      {leftToday.length > 0 && (
        <>
          <h3 className="admin-subheading">Left today</h3>
          {leftToday.map((entry) => (
            <p className="admin-help" key={entry.logId}>
              {entry.guest} · {entry.title} · {entry.adults + entry.children} guests · {formatTime(entry.checkedInAt)}{" "}
              to {entry.checkedOutAt ? formatTime(entry.checkedOutAt) : ""}
            </p>
          ))}
        </>
      )}
    </div>
  );
}
