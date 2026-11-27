import { after } from "next/server";
import { BookingCard } from "@/app/admin/_components/bookings/booking-card";
import { ManualBookingForm } from "@/app/admin/_components/bookings/manual-booking-form";
import { requireAdmin } from "@/app/admin/_lib/require-admin";
import { AdminPageFrame } from "@/app/admin/_components/ui/admin-page-frame";
import { makeBookingTitle, withLiveStatus } from "@/app/admin/_lib/booking-helpers";
import { manualBookingFormProps } from "@/app/admin/_lib/booking-form-props";
import { addDays } from "@/lib/availability";
import { expireUnpaidHolds } from "@/lib/booking-maintenance";
import { getBookingOptions, manilaToday } from "@/lib/booking-data";

export const metadata = { title: "Bookings" };

type PageProps = { searchParams: Promise<{ error?: string; saved?: string; receipt?: string }> };

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  const admin = await requireAdmin();
  const today = manilaToday();
  after(() => {
    void expireUnpaidHolds();
  });
  const [{ error, saved, receipt }, bookings, packages, units, blocked, openBookings, options, unitAvailability] =
    await Promise.all([
      searchParams,
      admin.supabase.from("bookings").select("*").order("created_at", { ascending: false }).limit(100),
      admin.supabase.from("packages").select("id,slug,name"),
      admin.supabase.from("units").select("id,name"),
      admin.supabase.from("blocked_dates").select("date").gte("date", today),
      admin.supabase
        .from("bookings")
        .select("*")
        .gte("date_end", today)
        .in("status", ["pending", "awaiting_payment", "confirmed"]),
      getBookingOptions("en"),
      admin.supabase.rpc("get_unit_availability", { from_date: today, through_date: addDays(today, 120) }),
    ]);
  const loadFailed = Boolean(bookings.error || packages.error || units.error);
  const bookingList = withLiveStatus(bookings.data ?? []);
  const bookingTitle = makeBookingTitle(packages.data ?? [], units.data ?? []);
  const closedDates = (blocked.data ?? []).map((item) => item.date);

  return (
    <AdminPageFrame section="bookings" flash={{ error, saved, receipt }} loadFailed={loadFailed}>
      {options && <ManualBookingForm {...manualBookingFormProps(options, unitAvailability.data, today)} />}
      <div className="admin-booking-list">
        {bookingList.length === 0 && <p className="admin-empty-state">No booking requests yet.</p>}
        {bookingList.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            bookingTitle={bookingTitle}
            today={today}
            openBookings={openBookings.data ?? []}
            closedDates={closedDates}
          />
        ))}
      </div>
    </AdminPageFrame>
  );
}
