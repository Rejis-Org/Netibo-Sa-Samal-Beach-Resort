import type { getDailyReport } from "@/lib/daily-report-data";
import { formatDateTime, formatFullDate } from "@/app/admin/_lib/format";

type DailyReportResult = NonNullable<Awaited<ReturnType<typeof getDailyReport>>>;

export function ReportSummary({ result, date, today }: { result: DailyReportResult; date: string; today: string }) {
  const dateLabel = formatFullDate(date);
  const people = (adults: number, children: number) => `${adults + children} (${adults} adults, ${children} children)`;

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">
            {result.closedAt
              ? `Closed ${formatDateTime(result.closedAt)}`
              : date > today
                ? "Planned"
                : "Live, not closed yet"}
          </p>
          <h2>{dateLabel}</h2>
        </div>
        <p>
          {result.closedAt
            ? "This is the saved end-of-day report. Later price edits do not change it."
            : "Numbers update as bookings and the logbook change until the day is closed."}
        </p>
      </div>
      <div className="admin-summary-grid">
        <article>
          <span>Arriving</span>
          <strong>{result.report.counts.arrivals}</strong>
        </article>
        <article>
          <span>Stays today</span>
          <strong>{result.report.counts.inHouse}</strong>
        </article>
        <article>
          <span>Leaving</span>
          <strong>{result.report.counts.departures}</strong>
        </article>
        <article>
          <span>Places booked</span>
          <strong>
            {result.report.counts.unitsBooked} of {result.report.counts.unitsTotal}
          </strong>
        </article>
      </div>
      <p className="admin-help">
        Guests booked: {people(result.report.headcount.bookedAdults, result.report.headcount.bookedChildren)}
      </p>
      <p className="admin-help">
        Guests checked in during the day:{" "}
        {people(result.report.headcount.checkedInAdults, result.report.headcount.checkedInChildren)}
      </p>
      <p className="admin-help">
        Still in the resort at the end of the day:{" "}
        {people(result.report.headcount.stillInAdults, result.report.headcount.stillInChildren)}
      </p>
    </section>
  );
}
