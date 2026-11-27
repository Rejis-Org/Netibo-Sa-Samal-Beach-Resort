import { Logbook } from "@/app/admin/_components/logbook/logbook";
import { ManualBookingForm } from "@/app/admin/_components/bookings/manual-booking-form";
import { requireAdmin } from "@/app/admin/_lib/require-admin";
import { AdminPageFrame } from "@/app/admin/_components/ui/admin-page-frame";
import { makeBookingTitle, withLiveStatus } from "@/app/admin/_lib/booking-helpers";
import { manualBookingFormProps } from "@/app/admin/_lib/booking-form-props";
import { buildLogbookEntries } from "@/app/admin/_lib/logbook-entries";
import { addDays } from "@/lib/availability";
import { getBookingOptions, manilaToday } from "@/lib/booking-data";

export const metadata = { title: "Guest logbook" };

type PageProps = { searchParams: Promise<{ error?: string; saved?: string }> };

export default async function AdminLogbookPage({ searchParams }: PageProps) {
  const admin = await requireAdmin();
  const today = manilaToday();
  const dayStart = new Date(`${today}T00:00:00+08:00`).toISOString();

  const [{ error, saved }, openLogs, leftLogs, dueBookings, packages, units, options, unitAvailability] =
    await Promise.all([
      searchParams,
      admin.supabase.from("guest_log").select("*").is("checked_out_at", null).order("checked_in_at"),
      admin.supabase.from("guest_log").select("*").gte("checked_out_at", dayStart).order("checked_out_at"),
      admin.supabase
        .from("bookings")
        .select("*")
        .in("status", ["confirmed", "awaiting_payment"])
        .lte("date_start", today)
        .gte("date_end", today)
        .order("guest_name"),
      admin.supabase.from("packages").select("id,slug,name"),
      admin.supabase.from("units").select("id,name"),
      getBookingOptions("en"),
      admin.supabase.rpc("get_unit_availability", { from_date: today, through_date: addDays(today, 120) }),
    ]);

  const logs = [...(openLogs.data ?? []), ...(leftLogs.data ?? [])];
  const logBookingIds = [...new Set(logs.map((log) => log.booking_id))];
  const due = withLiveStatus(dueBookings.data ?? []).filter(
    (booking) => booking.status === "confirmed" || booking.status === "awaiting_payment",
  );
  const dueIds = due.map((booking) => booking.id);

  const [logBookings, dueLogs] = await Promise.all([
    logBookingIds.length
      ? admin.supabase.from("bookings").select("*").in("id", logBookingIds)
      : Promise.resolve({ data: [], error: null }),
    dueIds.length
      ? admin.supabase.from("guest_log").select("booking_id").in("booking_id", dueIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const loadFailed = Boolean(
    openLogs.error ||
    leftLogs.error ||
    dueBookings.error ||
    packages.error ||
    units.error ||
    logBookings.error ||
    dueLogs.error,
  );
  const title = makeBookingTitle(packages.data ?? [], units.data ?? []);
  const { inResort, leftToday, expected } = buildLogbookEntries({
    openLogs: openLogs.data ?? [],
    leftLogs: leftLogs.data ?? [],
    dueLogs: dueLogs.data ?? [],
    logBookings: logBookings.data ?? [],
    due,
    title,
  });

  return (
    <AdminPageFrame section="logbook" flash={{ error, saved }} loadFailed={loadFailed}>
      {options && <ManualBookingForm walkIn {...manualBookingFormProps(options, unitAvailability.data, today)} />}
      <Logbook inResort={inResort} expected={expected} leftToday={leftToday} today={today} />
    </AdminPageFrame>
  );
}
