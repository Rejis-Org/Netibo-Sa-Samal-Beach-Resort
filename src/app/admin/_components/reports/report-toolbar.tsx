import Link from "next/link";
import { addDays } from "@/lib/availability";
import { PrintButton } from "@/app/admin/_components/reports/print-button";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

export function ReportToolbar({ date }: { date: string }) {
  return (
    <div className="report-toolbar no-print">
      <div className="report-toolbar-group">
        <Link className="button button-outline" href={`/admin/reports?date=${addDays(date, -1)}`}>
          <ChevronLeft size={18} aria-hidden="true" />
          Previous day
        </Link>
        <form method="get" className="report-date-form">
          <input type="date" name="date" defaultValue={date} aria-label="Report date" />
          <button className="button button-outline" type="submit">
            Show
          </button>
        </form>
        <Link className="button button-outline" href={`/admin/reports?date=${addDays(date, 1)}`}>
          Next day
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
      </div>
      <div className="report-toolbar-group">
        <PrintButton />
        <a className="button button-blue" href={`/admin/reports/export?date=${date}`}>
          <Download size={18} aria-hidden="true" />
          Download CSV
        </a>
      </div>
    </div>
  );
}
