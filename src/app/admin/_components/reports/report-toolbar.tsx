import Link from "next/link";
import { addDays } from "@/lib/availability";
import { PrintButton } from "@/app/admin/_components/reports/print-button";

export function ReportToolbar({ date }: { date: string }) {
  return (
    <div className="report-toolbar no-print">
      <Link href={`/admin/reports?date=${addDays(date, -1)}`}>← Previous day</Link>
      <form method="get" className="report-date-form">
        <input type="date" name="date" defaultValue={date} aria-label="Report date" />
        <button className="button button-outline" type="submit">
          Show
        </button>
      </form>
      <Link href={`/admin/reports?date=${addDays(date, 1)}`}>Next day →</Link>
      <PrintButton />
      <a className="button button-outline" href={`/admin/reports/export?date=${date}`}>
        Download CSV
      </a>
    </div>
  );
}
