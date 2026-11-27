import type { makeBookingTitle } from "@/app/admin/_lib/booking-helpers";
import type { Database } from "@/lib/supabase/database.types";

export type LogbookEntry = {
  logId: string;
  guest: string;
  phone: string;
  title: string;
  adults: number;
  children: number;
  checkedInAt: string;
  checkedOutAt: string | null;
  stayEnd: string;
};

export type ExpectedGuest = {
  bookingId: string;
  guest: string;
  phone: string;
  title: string;
  status: string;
  adults: number;
  children: number;
  stayStart: string;
  stayEnd: string;
};

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type GuestLog = Database["public"]["Tables"]["guest_log"]["Row"];

type LogbookSources = {
  openLogs: GuestLog[];
  leftLogs: GuestLog[];
  dueLogs: Pick<GuestLog, "booking_id">[];
  logBookings: Booking[];
  due: Booking[];
  title: ReturnType<typeof makeBookingTitle>;
};

export function buildLogbookEntries({ openLogs, leftLogs, dueLogs, logBookings, due, title }: LogbookSources) {
  const bookingById = new Map(logBookings.map((booking) => [booking.id, booking]));

  const toEntry = (log: GuestLog): LogbookEntry | null => {
    const booking = bookingById.get(log.booking_id);
    if (!booking) return null;
    return {
      logId: log.id,
      guest: booking.guest_name,
      phone: booking.phone,
      title: title(booking),
      adults: log.actual_adults,
      children: log.actual_children,
      checkedInAt: log.checked_in_at,
      checkedOutAt: log.checked_out_at,
      stayEnd: booking.date_end,
    };
  };

  const inResort = openLogs.map(toEntry).filter((entry): entry is LogbookEntry => entry !== null);
  const leftToday = leftLogs.map(toEntry).filter((entry): entry is LogbookEntry => entry !== null);

  const checkedInIds = new Set(dueLogs.map((log) => log.booking_id));
  const expected: ExpectedGuest[] = due
    .filter((booking) => !checkedInIds.has(booking.id))
    .map((booking) => ({
      bookingId: booking.id,
      guest: booking.guest_name,
      phone: booking.phone,
      title: title(booking),
      status: booking.status,
      adults: booking.adults,
      children: booking.children,
      stayStart: booking.date_start,
      stayEnd: booking.date_end,
    }));

  return { inResort, leftToday, expected };
}
