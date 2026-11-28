import { getAdminContext } from "@/lib/supabase/admin";
import { manilaToday } from "@/lib/booking-data";
import { getDailyReport } from "@/lib/daily-report-data";
import { reportToCsv } from "@/lib/daily-report";

// Downloads one day's report as a spreadsheet-friendly CSV. Admin only; a closed day downloads its saved snapshot.
export async function GET(request: Request) {
  const admin = await getAdminContext();
  if (!admin) return new Response("Not authorised", { status: 401 });
  const date = new URL(request.url).searchParams.get("date") ?? manilaToday();
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(`${date}T12:00:00Z`)) ||
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date
  )
    return new Response("Invalid date", { status: 400 });
  const result = await getDailyReport(admin.supabase, date);
  if (!result) return new Response("Could not build the report", { status: 500 });
  return new Response(reportToCsv(result.report), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="netibo-daily-report-${date}.csv"`,
      "cache-control": "no-store",
    },
  });
}
