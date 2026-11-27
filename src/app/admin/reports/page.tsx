import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { getAdminContext } from "@/lib/supabase/admin";
import { manilaToday } from "@/lib/booking-data";
import { getDailyReport } from "@/lib/daily-report-data";
import { closeDayAction } from "@/app/admin/_actions/reports";
import { ReportBookingsTable } from "@/app/admin/_components/reports/report-bookings-table";
import { ReportSales } from "@/app/admin/_components/reports/report-sales";
import { ReportSummary } from "@/app/admin/_components/reports/report-summary";
import { ReportToolbar } from "@/app/admin/_components/reports/report-toolbar";
import { ReportUnitsTable } from "@/app/admin/_components/reports/report-units-table";

export const metadata: Metadata = { title: "Daily report" };

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
  await cookies();
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?error=access");

  const today = manilaToday();
  const { date: dateParam, saved, error } = await searchParams;
  const date = validDate(dateParam) ? dateParam : today;
  const result = await getDailyReport(admin.supabase, date);

  return (
    <main className="admin-shell report-page">
      <header className="admin-topbar no-print">
        <div>
          <p className="eyebrow">Netibo sa Samal</p>
          <h1>Daily report</h1>
        </div>
        <div className="admin-account">
          <Link href="/admin/logbook">← Back to the logbook</Link>
        </div>
      </header>
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
    </main>
  );
}
