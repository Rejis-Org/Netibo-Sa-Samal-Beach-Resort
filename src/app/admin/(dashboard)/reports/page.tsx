import { manilaToday } from "@/lib/booking-data";
import { getDailyReport } from "@/lib/daily-report-data";
import { closeDayAction } from "@/app/admin/_actions/reports";
import { requireAdmin } from "@/app/admin/_lib/require-admin";
import { AdminPageFrame } from "@/app/admin/_components/ui/admin-page-frame";
import { ReportBookingsTable } from "@/app/admin/_components/reports/report-bookings-table";
import { ReportSales } from "@/app/admin/_components/reports/report-sales";
import { ReportSummary } from "@/app/admin/_components/reports/report-summary";
import { ReportToolbar } from "@/app/admin/_components/reports/report-toolbar";
import { ReportUnitsTable } from "@/app/admin/_components/reports/report-units-table";

export const metadata = { title: "Daily report" };

type Props = { searchParams: Promise<{ date?: string; saved?: string; error?: string }> };

function validDate(value: string | undefined): value is string {
  return Boolean(
    value &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value,
  );
}

export default async function DailyReportPage({ searchParams }: Props) {
  const admin = await requireAdmin();

  const today = manilaToday();
  const { date: dateParam, saved, error } = await searchParams;
  const date = validDate(dateParam) ? dateParam : today;
  const result = await getDailyReport(admin.supabase, date);

  return (
    <AdminPageFrame section="reports">
      <div className="report-page">
        {saved && <p className="admin-message admin-message-success no-print">The day was closed and saved.</p>}
        {error && (
          <p className="admin-message admin-message-error no-print">
            That report could not be saved. Check the date and try again.
          </p>
        )}

        <ReportToolbar date={date} />

        {!result ? (
          <p className="admin-message admin-message-error">
            Could not load this report. Confirm that the latest <code>supabase/schema.sql</code> has been run.
          </p>
        ) : (
          <>
            <ReportSummary result={result} date={date} today={today} />

            <ReportUnitsTable result={result} />

            <ReportBookingsTable result={result} />

            <ReportSales result={result} />

            {date <= today && (
              <form action={closeDayAction} className="report-close no-print">
                <input type="hidden" name="date" value={date} />
                <button className="button button-blue" type="submit">
                  {result.closedAt ? "Update the saved report" : "Close the day and save this report"}
                </button>
                <p className="admin-help">
                  {result.closedAt
                    ? "Saves the numbers as they stand now over the earlier snapshot."
                    : "Saves a snapshot so this day never changes, even if prices are edited later."}
                </p>
              </form>
            )}
          </>
        )}
      </div>
    </AdminPageFrame>
  );
}
