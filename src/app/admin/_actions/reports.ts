"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Json } from "@/lib/supabase/database.types";
import { getAdminContext } from "@/lib/supabase/admin";
import { manilaToday } from "@/lib/booking-data";
import { loadDailyReport } from "@/lib/daily-report-data";
import { readText, validDateText, logChange } from "@/app/admin/_lib/action-helpers";

// End of day: saves the report as it stands, so later price edits never change a closed day.
export async function closeDayAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");
  const date = readText(formData, "date", 10);
  if (!validDateText(date) || date > manilaToday()) redirect("/admin/reports?error=date");
  const report = await loadDailyReport(admin.supabase, date);
  if (!report) redirect(`/admin/reports?date=${date}&error=load`);
  const { error } = await admin.supabase.from("daily_reports").upsert(
    {
      report_date: date,
      data: report as unknown as Json,
      closed_by: admin.userId,
      closed_at: new Date().toISOString(),
    },
    { onConflict: "report_date" },
  );
  if (error) redirect(`/admin/reports?date=${date}&error=load`);
  await logChange(admin.supabase, admin.userId, "daily_reports", date, null, { closed: true });
  revalidatePath("/admin/reports");
  redirect(`/admin/reports?date=${date}&saved=1`);
}
