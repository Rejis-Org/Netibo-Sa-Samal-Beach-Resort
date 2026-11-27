import { AvailabilityGrid } from "@/app/admin/_components/availability/availability-grid";
import { requireAdmin } from "@/app/admin/_lib/require-admin";
import { AdminPageFrame } from "@/app/admin/_components/ui/admin-page-frame";
import { withLiveStatus } from "@/app/admin/_lib/booking-helpers";
import { addDays } from "@/lib/availability";
import { manilaToday } from "@/lib/booking-data";

export const metadata = { title: "Availability" };

type PageProps = { searchParams: Promise<{ from?: string; error?: string; saved?: string }> };

const SPAN = 14;

export default async function AdminAvailabilityPage({ searchParams }: PageProps) {
  const admin = await requireAdmin();
  const today = manilaToday();
  const { from: fromParam, error, saved } = await searchParams;
  const from = fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam) && fromParam >= today ? fromParam : today;
  const through = addDays(from, SPAN - 1);

  const [units, bookings, blocked] = await Promise.all([
    admin.supabase.from("units").select("*").eq("active", true).order("sort_order").order("name"),
    admin.supabase
      .from("bookings")
      .select("*")
      .lte("date_start", through)
      .gte("date_end", from)
      .in("status", ["pending", "awaiting_payment", "confirmed"]),
    admin.supabase.from("blocked_dates").select("date").gte("date", from).lte("date", through),
  ]);

  const loadFailed = Boolean(units.error || bookings.error || blocked.error);

  return (
    <AdminPageFrame section="availability" flash={{ error, saved }} loadFailed={loadFailed}>
      <AvailabilityGrid
        units={units.data ?? []}
        bookings={withLiveStatus(bookings.data ?? [])}
        blockedDates={(blocked.data ?? []).map((item) => item.date)}
        from={from}
        today={today}
        span={SPAN}
      />
    </AdminPageFrame>
  );
}
