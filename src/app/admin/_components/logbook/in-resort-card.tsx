import { checkOutAction } from "@/app/admin/_actions/logbook";
import { formatShortDate, formatTime } from "@/app/admin/_lib/format";
import type { LogbookEntry } from "@/app/admin/_lib/logbook-entries";

export function InResortCard({ entry, today }: { entry: LogbookEntry; today: string }) {
  return (
    <article className="admin-booking-card">
      <div className="admin-booking-heading">
        <div>
          <p className="eyebrow">
            In at {formatTime(entry.checkedInAt)} · stay ends {formatShortDate(entry.stayEnd)}
          </p>
          <h3>{entry.guest}</h3>
          <p>
            {entry.title} · {entry.adults} adults, {entry.children} children
          </p>
        </div>
        {entry.stayEnd < today ? (
          <span className="admin-flag">Past check-out day</span>
        ) : entry.stayEnd === today ? (
          <span className="admin-flag">Leaves today</span>
        ) : null}
      </div>
      <div className="admin-booking-details">
        <a href={`tel:${entry.phone.replace(/[^+\d]/g, "")}`}>{entry.phone}</a>
      </div>
      <form className="admin-booking-actions" action={checkOutAction}>
        <input type="hidden" name="log_id" value={entry.logId} />
        <button className="button button-outline" type="submit">
          Check out
        </button>
      </form>
    </article>
  );
}
