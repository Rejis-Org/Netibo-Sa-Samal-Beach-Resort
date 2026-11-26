import Link from "next/link";
import { after } from "next/server";
import { updateBookingStatusAction } from "@/app/admin/actions";
import { ManualBookingForm } from "@/app/admin/manual-booking-form";
import { requireAdmin } from "@/app/admin/require-admin";
import { AdminPageFrame, formatDate, makeBookingTitle, peso, withLiveStatus } from "@/app/admin/admin-ui";
import { expireUnpaidHolds } from "@/lib/booking-maintenance";
import { catalogFromRows } from "@/lib/booking-pricing";

export const metadata = { title: "Bookings" };

type PageProps = { searchParams: Promise<{ error?: string; saved?: string; receipt?: string }> };

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  const admin = await requireAdmin();
  after(() => { void expireUnpaidHolds(); });
  const [{ error, saved, receipt }, bookings, packages, units, fee] = await Promise.all([
    searchParams,
    admin.supabase.from("bookings").select("*").order("created_at", { ascending: false }).limit(100),
    admin.supabase.from("packages").select("id,slug,name,scope,price_amount,pax_included,active").order("sort_order"),
    admin.supabase.from("units").select("id,name,price_amount,active").order("sort_order"),
    admin.supabase.from("settings").select("value").eq("key", "extra_guest_fee").maybeSingle(),
  ]);
  const loadFailed = Boolean(bookings.error || packages.error || units.error);
  const bookingList = withLiveStatus(bookings.data ?? []);
  const bookingTitle = makeBookingTitle(packages.data ?? [], units.data ?? []);
  const manualCatalog = catalogFromRows((packages.data ?? []).filter((item) => item.active), (units.data ?? []).filter((item) => item.active), fee.data?.value);

  return (
    <AdminPageFrame section="bookings" flash={{ error, saved, receipt }} loadFailed={loadFailed}>
      <ManualBookingForm catalog={manualCatalog} />
      <div className="admin-booking-list">
        {bookingList.length === 0 && <p className="admin-empty-state">No booking requests yet.</p>}
        {bookingList.map((booking) => (
          <article className="admin-booking-card" key={booking.id}>
            <div className="admin-booking-heading"><div><p className="eyebrow">{booking.ref_code} · {formatDate(booking.date_start)}</p><h3>{booking.guest_name}</h3><p>{bookingTitle(booking)} · {booking.adults + booking.children} guests</p></div><span className={`booking-status booking-status-${booking.status}`}>{booking.status.replaceAll("_", " ")}</span></div>
            <div className="admin-booking-details"><a href={`tel:${booking.phone.replace(/[^+\d]/g, "")}`}>{booking.phone}</a>{booking.guest_email && <a href={`mailto:${booking.guest_email}`}>{booking.guest_email}</a>}<strong>{peso.format(booking.total_amount)}</strong><Link className="admin-receipt-link" href={`/admin/receipt/${booking.id}`} target="_blank">View receipt</Link></div>
            {booking.notes && <p className="admin-booking-notes">{booking.notes}</p>}
            {booking.deposit_required !== null && <p className="admin-help">Deposit requested: ₱{booking.deposit_required.toLocaleString("en-PH")} · Deadline {booking.payment_deadline ? new Date(booking.payment_deadline).toLocaleString("en-PH") : "not set"}</p>}
            <form className="admin-booking-actions" action={updateBookingStatusAction}><input type="hidden" name="booking_id" value={booking.id} />
              {booking.status === "pending" && <><button className="button button-blue" name="booking_action" value="approve">Approve</button><button className="button button-outline" name="booking_action" value="decline">Decline</button></>}
              {booking.status === "awaiting_payment" && <><button className="button button-blue" name="booking_action" value="paid">Mark paid</button><button className="button button-outline" name="booking_action" value="cancel">Cancel</button></>}
              {booking.status === "confirmed" && <><button className="button button-blue" name="booking_action" value="complete">Complete</button><button className="button button-outline" name="booking_action" value="cancel">Cancel</button></>}
            </form>
          </article>
        ))}
      </div>
    </AdminPageFrame>
  );
}
