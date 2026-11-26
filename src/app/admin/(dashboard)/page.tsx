import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { manilaToday } from "@/lib/booking-data";
import { expireUnpaidHolds } from "@/lib/booking-maintenance";
import { requireAdmin } from "@/app/admin/require-admin";
import { findSection, sectionHref } from "@/app/admin/admin-sections";
import { AdminPageFrame, formatDate, makeBookingTitle, peso, withLiveStatus } from "@/app/admin/admin-ui";

type PageProps = { searchParams: Promise<{ error?: string; saved?: string; section?: string; receipt?: string }> };

export default async function AdminOverviewPage({ searchParams }: PageProps) {
  await cookies();
  if (!getSupabaseEnv()) {
    return (
      <main className="admin-shell">
        <section className="admin-setup-card">
          <p className="eyebrow">Netibo sa Samal</p>
          <h1>Connect the resort database</h1>
          <p>Add the Supabase project URL and publishable key to `.env.local`, then run `supabase/schema.sql` once in the Supabase SQL Editor.</p>
          <Link className="button button-blue" href="/admin/login">Open sign in</Link>
        </section>
      </main>
    );
  }

  const { error, saved, section, receipt } = await searchParams;
  // Older links and redirects use /admin?section=bookings. Send them to the section's own page.
  if (section && section !== "overview" && findSection(section)) {
    const rest = new URLSearchParams();
    if (error) rest.set("error", error);
    if (saved) rest.set("saved", saved);
    if (receipt) rest.set("receipt", receipt);
    const query = rest.toString();
    redirect(`${sectionHref(findSection(section)!.id)}${query ? `?${query}` : ""}`);
  }

  const admin = await requireAdmin();
  const today = manilaToday();
  after(() => { void expireUnpaidHolds(); });
  const [units, packages, bookings, blocked] = await Promise.all([
    admin.supabase.from("units").select("id,name,active"),
    admin.supabase.from("packages").select("id,slug,name"),
    admin.supabase.from("bookings").select("*").order("created_at", { ascending: false }).limit(100),
    admin.supabase.from("blocked_dates").select("id,date,reason").gte("date", today).order("date").limit(5),
  ]);
  const loadFailed = Boolean(units.error || packages.error || bookings.error || blocked.error);

  const bookingList = withLiveStatus(bookings.data ?? []);
  const bookingTitle = makeBookingTitle(packages.data ?? [], units.data ?? []);
  const pendingBookings = bookingList.filter((item) => item.status === "pending");
  const awaitingCount = bookingList.filter((item) => item.status === "awaiting_payment").length;
  const upcoming = bookingList
    .filter((item) => (item.status === "awaiting_payment" || item.status === "confirmed") && item.date_start >= today)
    .sort((a, b) => a.date_start.localeCompare(b.date_start));
  const activeUnits = (units.data ?? []).filter((item) => item.active).length;
  const blockedDates = blocked.data ?? [];

  return (
    <AdminPageFrame section="overview" flash={{ error, saved, receipt }} loadFailed={loadFailed}>
      <section className="admin-summary-grid" aria-label="Resort overview">
        <Link href={sectionHref("bookings")}><span>Pending requests</span><strong>{pendingBookings.length}</strong><em>Need your approval</em></Link>
        <Link href={sectionHref("bookings")}><span>Awaiting payment</span><strong>{awaitingCount}</strong><em>Approved, deposit not paid yet</em></Link>
        <Link href={sectionHref("bookings")}><span>Upcoming bookings</span><strong>{upcoming.length}</strong><em>Awaiting payment or confirmed</em></Link>
        <Link href={sectionHref("units")}><span>Active listings</span><strong>{activeUnits}<small> / {units.data?.length ?? 0}</small></strong><em>Cottages and rooms shown to guests</em></Link>
      </section>
      <div className="admin-dashboard-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading"><h2>Needs your approval</h2><Link href={sectionHref("bookings")}>View all</Link></div>
          {pendingBookings.length === 0 && <p className="admin-empty-state">No pending requests. You&apos;re all caught up.</p>}
          <ul className="admin-mini-list">
            {pendingBookings.slice(0, 5).map((booking) => (
              <li key={booking.id}>
                <div><strong>{booking.guest_name}</strong><span>{bookingTitle(booking)} · {formatDate(booking.date_start)}</span></div>
                <b>{peso.format(booking.total_amount)}</b>
              </li>
            ))}
          </ul>
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading"><h2>Coming up</h2><Link href={sectionHref("bookings")}>View all</Link></div>
          {upcoming.length === 0 && <p className="admin-empty-state">No upcoming bookings yet.</p>}
          <ul className="admin-mini-list">
            {upcoming.slice(0, 5).map((booking) => (
              <li key={booking.id}>
                <div><strong>{booking.guest_name}</strong><span>{bookingTitle(booking)} · {formatDate(booking.date_start)}</span></div>
                <span className={`booking-status booking-status-${booking.status}`}>{booking.status.replaceAll("_", " ")}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading"><h2>Closed dates ahead</h2><Link href={sectionHref("blocked-dates")}>Manage</Link></div>
          {blockedDates.length === 0 && <p className="admin-empty-state">No closed dates coming up.</p>}
          <ul className="admin-mini-list">
            {blockedDates.map((item) => (
              <li key={item.id}><div><strong>{formatDate(item.date)}</strong><span>{item.reason}</span></div></li>
            ))}
          </ul>
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading"><h2>Quick actions</h2></div>
          <div className="admin-quick-actions">
            <Link href={sectionHref("chats")}>Open live chats</Link>
            <Link href={sectionHref("bookings")}>Add a manual booking</Link>
            <Link href={sectionHref("blocked-dates")}>Close a date</Link>
            <Link href={sectionHref("packages")}>Edit packages and prices</Link>
          </div>
        </section>
      </div>
    </AdminPageFrame>
  );
}
