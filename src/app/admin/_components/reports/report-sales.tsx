import type { getDailyReport } from "@/lib/daily-report-data";
import { peso } from "@/app/admin/_lib/format";

type DailyReportResult = NonNullable<Awaited<ReturnType<typeof getDailyReport>>>;

export function ReportSales({ result }: { result: DailyReportResult }) {
  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">Sales</p>
          <h2>{peso.format(result.report.sales.total)}</h2>
        </div>
        <p>
          Each booking&apos;s share for this day, not cash received. Multi-day rooms and entrance are split evenly per
          day; corkage and whole-resort packages count on the first day.
        </p>
      </div>
      <ul className="admin-price-breakdown">
        <li>
          <span>Rooms and cottages</span>
          <span>{peso.format(result.report.sales.rooms)}</span>
        </li>
        <li>
          <span>Entrance fees</span>
          <span>{peso.format(result.report.sales.entrance)}</span>
        </li>
        <li>
          <span>Whole-resort packages</span>
          <span>{peso.format(result.report.sales.packages)}</span>
        </li>
        <li>
          <span>Corkage</span>
          <span>{peso.format(result.report.sales.corkage)}</span>
        </li>
        {result.report.sales.other > 0 && (
          <li>
            <span>Other (totals edited by hand or without a price breakdown)</span>
            <span>{peso.format(result.report.sales.other)}</span>
          </li>
        )}
      </ul>
    </section>
  );
}
