// Loads what the end-of-day report needs from the database and hands it to the pure builder in daily-report.ts.
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/availability";
import { buildDailyReport, type DailyReport } from "@/lib/daily-report";

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** A closed day's saved snapshot when there is one, otherwise the live report. */
export async function getDailyReport(supabase: Client, date: string): Promise<{ report: DailyReport; closedAt: string | null } | null> {
  const { data: snapshot } = await supabase.from("daily_reports").select("data,closed_at").eq("report_date", date).maybeSingle();
  if (snapshot && isDailyReport(snapshot.data)) return { report: snapshot.data, closedAt: snapshot.closed_at };
  const live = await loadDailyReport(supabase, date);
  return live ? { report: live, closedAt: null } : null;
}

function isDailyReport(value: unknown): value is DailyReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Record<string, unknown>;
  return typeof report.date === "string" && Array.isArray(report.units) && Array.isArray(report.bookings)
    && Boolean(report.sales) && typeof report.sales === "object" && Boolean(report.headcount) && typeof report.headcount === "object"
    && Boolean(report.counts) && typeof report.counts === "object";
}

/** The report for one resort date (Asia/Manila), or null when the data could not be loaded. */
export async function loadDailyReport(supabase: Client, date: string): Promise<DailyReport | null> {
  const dayStart = `${date}T00:00:00+08:00`;
  const dayEnd = `${addDays(date, 1)}T00:00:00+08:00`;
  // PostgREST filters read timestamps most safely in UTC, without a "+" offset.
  const startUtc = new Date(dayStart).toISOString();
  const endUtc = new Date(dayEnd).toISOString();
  const [units, bookings, packages, logs] = await Promise.all([
    supabase.from("units").select("id,name,type,active").order("sort_order"),
    supabase.from("bookings")
      .select("id,ref_code,guest_name,status,type,package_id,unit_ids,date_start,date_end,adults,children,total_amount,total_overridden,price_breakdown")
      .lte("date_start", date).gte("date_end", date).in("status", ["awaiting_payment", "confirmed", "completed"]),
    supabase.from("packages").select("id,slug,name"),
    supabase.from("guest_log").select("booking_id,actual_adults,actual_children,checked_in_at,checked_out_at")
      .lt("checked_in_at", endUtc).or(`checked_out_at.is.null,checked_out_at.gte.${startUtc}`),
  ]);
  if (units.error || bookings.error || packages.error || logs.error) return null;

  const packageNames: Record<string, string> = {};
  for (const item of packages.data ?? []) {
    const name = item.name;
    packageNames[item.id] = name && typeof name === "object" && !Array.isArray(name) && typeof name.en === "string" ? name.en : item.slug;
  }
  return buildDailyReport({
    date,
    dayStart,
    dayEnd,
    units: (units.data ?? []).filter((unit) => unit.active).map(({ id, name, type }) => ({ id, name, type })),
    bookings: bookings.data ?? [],
    logs: logs.data ?? [],
    packageNames,
  });
}
