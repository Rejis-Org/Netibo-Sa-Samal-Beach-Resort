import Link from "next/link";
import { sectionHref } from "@/app/admin/_lib/admin-sections";
import { formatDate } from "@/app/admin/_lib/format";
import type { Database } from "@/lib/supabase/database.types";

type BlockedDate = Pick<Database["public"]["Tables"]["blocked_dates"]["Row"], "id" | "date" | "reason">;

export function ClosedDatesPanel({ blockedDates }: { blockedDates: BlockedDate[] }) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <h2>Closed dates ahead</h2>
        <Link href={sectionHref("blocked-dates")}>Manage</Link>
      </div>
      {blockedDates.length === 0 && <p className="admin-empty-state">No closed dates coming up.</p>}
      <ul className="admin-mini-list">
        {blockedDates.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{formatDate(item.date)}</strong>
              <span>{item.reason}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
