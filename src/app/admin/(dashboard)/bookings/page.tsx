import Link from "next/link";
import { after } from "next/server";
import { updateBookingStatusAction } from "@/app/admin/actions";
import { EditBookingForm, ExtendBookingForm, breakdownSummary } from "@/app/admin/editor-forms";
import { ManualBookingForm } from "@/app/admin/manual-booking-form";
import { requireAdmin } from "@/app/admin/require-admin";
import { AdminPageFrame, makeBookingTitle, peso, withLiveStatus } from "@/app/admin/admin-ui";
import { addDays, maxExtensionDays } from "@/lib/availability";
import { expireUnpaidHolds } from "@/lib/booking-maintenance";
import { getBookingOptions, manilaToday } from "@/lib/booking-data";

export const metadata = { title: "Bookings" };

type PageProps = { searchParams: Promise<{ error?: string; saved?: string; receipt?: string }> };

const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });
const dayLabel = (value: string) => dateFormat.format(new Date(`${value}T12:00:00+08:00`));

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  const admin = await requireAdmin();
  const today = manilaToday();
  after(() => { void expireUnpaidHolds(); });
  const [{ error, saved, receipt }, bookings, packages, units, blocked, openBookings, options, unitAvailability] = await Promise.all([
    searchParams,
    admin.supabase.from("bookings").select("*").order("created_at", { ascending: false }).limit(100),
    admin.supabase.from("packages").select("id,slug,name"),
    admin.supabase.from("units").select("id,name"),
    admin.supabase.from("blocked_dates").select("date").gte("date", today),
    admin.supabase.from("bookings").select("*").gte("date_end", today).in("status", ["pending", "awaiting_payment", "confirmed"]),
    getBookingOptions("en"),
    admin.supabase.rpc("get_unit_availability", { from_date: today, through_date: addDays(today, 120) }),
  ]);
  const loadFailed = Boolean(bookings.error || packages.error || units.error);
  const bookingList = withLiveStatus(bookings.data ?? []);
  const bookingTitle = makeBookingTitle(packages.data ?? [], units.data ?? []);
  const closedDates = (blocked.data ?? []).map((item) => item.date);

  return (
    <AdminPageFrame section="bookings" flash={{ error, saved, receipt }} loadFailed={loadFailed}>
      {options && <ManualBookingForm packages={options.packages.filter((item) => item.scope === "exclusive" && item.price !== null).map((item) => ({ id: item.id, name: item.name, price: item.price, paxIncluded: item.paxIncluded }))} units={options.units.map((item) => ({ id: item.id, name: item.name, price: item.price, freeEntranceCount: item.freeEntranceCount }))} unitRows={unitAvailability.data ?? []} entranceFees={options.entranceFees} extraGuestFee={options.extraGuestFee} today={today} />}
      <div className="admin-booking-list">
        {bookingList.length === 0 && <p className="admin-empty-state">No booking requests yet.</p>}
        {bookingList.map((booking) => {
          const date = booking.date_end > booking.date_start ? `${dayLabel(booking.date_start)} – ${dayLabel(booking.date_end)}` : dayLabel(booking.date_start);
          const canExtend = booking.type === "unit" && (booking.status === "confirmed" || booking.status === "awaiting_payment") && booking.date_end >= today;
          const extendDays = canExtend ? maxExtensionDays({ booking, bookings: openBookings.data ?? [], blockedDates: closedDates }) : 0;
          const summary = breakdownSummary(booking.price_breakdown);
          return (
            <article className="admin-booking-card" key={booking.id}>
              <div className="admin-booking-heading"><div><p className="eyebrow">{booking.ref_code} · {date}</p><h3>{booking.guest_name}</h3><p>{bookingTitle(booking)} · {booking.adults + booking.children} guests</p></div><span className={`booking-status booking-status-${booking.status}`}>{booking.status.replaceAll("_", " ")}</span></div>
              <div className="admin-booking-details"><a href={`tel:${booking.phone.replace(/[^+\d]/g, "")}`}>{booking.phone}</a>{booking.guest_email && <a href={`mailto:${booking.guest_email}`}>{booking.guest_email}</a>}<strong>{peso.format(booking.total_amount)}</strong><Link className="admin-receipt-link" href={`/admin/receipt/${booking.id}`} target="_blank">View receipt</Link></div>
              {booking.notes && <p className="admin-booking-notes">{booking.notes}</p>}
              {summary && <p className="admin-help">{summary}{booking.total_overridden && <> · <span className="admin-flag">Total set by hand</span></>}</p>}
              {booking.deposit_required !== null && <p className="admin-help">Deposit requested: ₱{booking.deposit_required.toLocaleString("en-PH")} · Deadline {booking.payment_deadline ? new Date(booking.payment_deadline).toLocaleString("en-PH") : "not set"}</p>}
              <form className="admin-booking-actions" action={updateBookingStatusAction}><input type="hidden" name="booking_id" value={booking.id} />
                {booking.status === "pending" && <><button className="button button-blue" name="booking_action" value="approve">Approve</button><button className="button button-outline" name="booking_action" value="decline">Decline</button></>}
                {booking.status === "awaiting_payment" && <><button className="button button-blue" name="booking_action" value="paid">Mark paid</button><button className="button button-outline" name="booking_action" value="cancel">Cancel</button></>}
                {booking.status === "confirmed" && <><button className="button button-blue" name="booking_action" value="complete">Complete</button><button className="button button-outline" name="booking_action" value="cancel">Cancel</button></>}
              </form>
              {canExtend && <ExtendBookingForm booking={booking} maxDays={extendDays} />}
              <EditBookingForm booking={booking} />
            </article>
          );
        })}
      </div>
    </AdminPageFrame>
  );
}
