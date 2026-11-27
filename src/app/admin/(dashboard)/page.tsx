import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { manilaToday } from "@/lib/booking-data";
import { expireUnpaidHolds } from "@/lib/booking-maintenance";
import { requireAdmin } from "@/app/admin/_lib/require-admin";
import { findSection, sectionHref } from "@/app/admin/_lib/admin-sections";
import { AdminPageFrame } from "@/app/admin/_components/ui/admin-page-frame";
import { makeBookingTitle, withLiveStatus } from "@/app/admin/_lib/booking-helpers";
import { ClosedDatesPanel } from "@/app/admin/_components/dashboard/closed-dates-panel";
import { PendingPanel } from "@/app/admin/_components/dashboard/pending-panel";
import { QuickActions } from "@/app/admin/_components/dashboard/quick-actions";
import { SummaryCards } from "@/app/admin/_components/dashboard/summary-cards";
import { UpcomingPanel } from "@/app/admin/_components/dashboard/upcoming-panel";

type PageProps = { searchParams: Promise<{ error?: string; saved?: string; section?: string; receipt?: string }> };

export default async function AdminOverviewPage({ searchParams }: PageProps) {
  await cookies();
  if (!getSupabaseEnv()) {
    return (
      <main className="admin-shell">
        <section className="admin-setup-card">
          <p className="eyebrow">Netibo sa Samal</p>
          <h1>Connect the resort database</h1>
          <p>
            Add the Supabase project URL and publishable key to `.env.local`, then run `supabase/schema.sql` once in the
            Supabase SQL Editor.
          </p>
          <Link className="button button-blue" href="/admin/login">
            Open sign in
          </Link>
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
  after(() => {
    void expireUnpaidHolds();
  });
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
      <SummaryCards
        pendingBookings={pendingBookings}
        awaitingCount={awaitingCount}
        upcoming={upcoming}
        activeUnits={activeUnits}
        totalUnits={units.data?.length ?? 0}
      />
      <div className="admin-dashboard-grid">
        <PendingPanel pendingBookings={pendingBookings} bookingTitle={bookingTitle} />
        <UpcomingPanel upcoming={upcoming} bookingTitle={bookingTitle} />
        <ClosedDatesPanel blockedDates={blockedDates} />
        <QuickActions />
      </div>
    </AdminPageFrame>
  );
}
