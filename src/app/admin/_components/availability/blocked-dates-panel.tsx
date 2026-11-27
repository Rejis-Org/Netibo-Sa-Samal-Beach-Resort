import type { Database } from "@/lib/supabase/database.types";
import { addBlockedDateAction, removeBlockedDateAction } from "@/app/admin/_actions/blocked-dates";
import { formatFullDate } from "@/app/admin/_lib/format";

type BlockedDate = Database["public"]["Tables"]["blocked_dates"]["Row"];

export function BlockedDatesPanel({ dates }: { dates: BlockedDate[] }) {
  return (
    <div className="admin-booking-list">
      <form action={addBlockedDateAction} className="admin-form admin-editor-form">
        <label>
          Date to close
          <input name="date" type="date" required />
        </label>
        <label>
          Reason (optional)
          <input name="reason" maxLength={120} placeholder="For example, maintenance" />
        </label>
        <button className="button button-blue admin-field-wide" type="submit">
          Close this date
        </button>
      </form>
      {dates.length === 0 && <p className="admin-empty-state">No closed dates.</p>}
      {dates.map((item) => (
        <article className="admin-booking-card" key={item.id}>
          <div className="admin-booking-heading">
            <div>
              <h3>{formatFullDate(item.date)}</h3>
              <p>{item.reason}</p>
            </div>
            <form action={removeBlockedDateAction}>
              <input type="hidden" name="id" value={item.id} />
              <button className="button button-outline" type="submit">
                Reopen
              </button>
            </form>
          </div>
        </article>
      ))}
    </div>
  );
}
