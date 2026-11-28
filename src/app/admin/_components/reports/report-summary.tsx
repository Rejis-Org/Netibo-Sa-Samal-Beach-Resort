import type { getDailyReport } from "@/lib/daily-report-data";
import { formatDateTime, formatFullDate } from "@/app/admin/_lib/format";
import { MotionCard } from "@/app/admin/_components/ui/motion-card";

type DailyReportResult = NonNullable<Awaited<ReturnType<typeof getDailyReport>>>;

function Headcount({ label, adults, kids }: { label: string; adults: number; kids: number }) {
  return (
    <MotionCard>
      <span>{label}</span>
      <strong>{adults + kids}</strong>
      <small>
        {adults} adults, {kids} children
      </small>
    </MotionCard>
  );
}

export function ReportSummary({ result, date, today }: { result: DailyReportResult; date: string; today: string }) {
  const dateLabel = formatFullDate(date);
  const { counts, headcount } = result.report;

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
        <MotionCard>
          <span>Arriving</span>
          <strong>{counts.arrivals}</strong>
        </MotionCard>
        <MotionCard>
          <span>Stays today</span>
          <strong>{counts.inHouse}</strong>
        </MotionCard>
        <MotionCard>
          <span>Leaving</span>
          <strong>{counts.departures}</strong>
        </MotionCard>
        <MotionCard>
          <span>Places booked</span>
          <strong>
            {counts.unitsBooked} <small>of {counts.unitsTotal}</small>
          </strong>
        </MotionCard>
      </div>
      <div className="report-headcount">
        <Headcount label="Guests booked" adults={headcount.bookedAdults} kids={headcount.bookedChildren} />
        <Headcount
          label="Guests checked in during the day"
          adults={headcount.checkedInAdults}
          kids={headcount.checkedInChildren}
        />
        <Headcount
          label="Still in the resort at the end of the day"
          adults={headcount.stillInAdults}
          kids={headcount.stillInChildren}
        />
      </div>
    </section>
  );
}
