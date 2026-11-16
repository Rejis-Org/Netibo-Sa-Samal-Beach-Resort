import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAdminContext } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { logoutAction, updateBookingStatusAction } from "./actions";
import { BlockedDatesPanel, ManualBookingForm, PackageEditor, SettingsEditor, UnitEditor } from "./editor-forms";
import { AdminChatInbox } from "./chat-inbox";
import { manilaToday } from "@/lib/booking-data";
import { expireUnpaidHolds } from "@/lib/booking-maintenance";

type AdminPageProps = { searchParams: Promise<{ error?: string; saved?: string }> };

const errorMessages: Record<string, string> = {
  unit: "Please check the unit fields and try saving again.",
  package: "Please check the package fields and try saving again.",
  settings: "Please check the setting value and try saving again.",
  access: "Only the owner account can change resort settings.",
  booking: "That booking could not be updated. Refresh the list and try again.",
  deadline: "Set a payment deadline in Resort settings before approving a request.",
  conflict: "Those dates were just taken by another approved booking. The request remains pending.",
  manual: "That booking could not be saved. Check the details; the date or place may already be taken.",
  blocked: "That closed date could not be saved or removed. Check it and try again.",
  blockedExists: "That date is already closed.",
  blockedConflict: "That date already has an approved or confirmed booking. Cancel that booking first.",
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await cookies();
  const configured = Boolean(getSupabaseEnv());
  if (!configured) {
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

  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?error=access");

  const today = manilaToday();
  await expireUnpaidHolds();
  const [{ data: units, error: unitsError }, { data: packages, error: packagesError }, { data: bookings, error: bookingsError }, { data: blockedDates, error: blockedError }] = await Promise.all([
    admin.supabase.from("units").select("*").order("sort_order"),
    admin.supabase.from("packages").select("*").order("sort_order"),
    admin.supabase.from("bookings").select("*").order("created_at", { ascending: false }).limit(100),
    admin.supabase.from("blocked_dates").select("*").gte("date", today).order("date"),
  ]);
  const { data: settings, error: settingsError } = admin.role === "owner"
    ? await admin.supabase.from("settings").select("*").order("key")
    : { data: [], error: null };
  const { error, saved } = await searchParams;
  const loadFailed = unitsError || packagesError || bookingsError || settingsError || blockedError;
  const packageNames = new Map((packages ?? []).map((item) => [item.id, typeof item.name === "object" && item.name && !Array.isArray(item.name) && typeof item.name.en === "string" ? item.name.en : item.slug]));
  const unitNames = new Map((units ?? []).map((item) => [item.id, item.name]));
  const pendingCount = (bookings ?? []).filter((item) => item.status === "pending").length;
  const unreadBookingCount = pendingCount;

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div><p className="eyebrow">Netibo sa Samal</p><h1>Resort admin</h1></div>
        <div className="admin-account"><span>{admin.email} · {admin.role}</span><form action={logoutAction}><button className="admin-text-button" type="submit">Sign out</button></form></div>
      </header>
      <nav className="admin-nav" aria-label="Admin sections">
        <a href="#chats">Chats</a><a href="#bookings">Bookings</a><a href="#blocked-dates">Closed dates</a><a href="#units">Cottages and rooms</a><a href="#packages">Packages and prices</a>{admin.role === "owner" && <a href="#settings">Resort settings</a>}
        <Link href="/">View public site ↗</Link>
      </nav>
      <section className="admin-summary-grid" aria-label="Resort overview">
        <article><span>Pending requests</span><strong>{unreadBookingCount}</strong></article>
        <article><span>Upcoming exclusive dates</span><strong>{(bookings ?? []).filter((item) => item.type === "exclusive" && (item.status === "awaiting_payment" || item.status === "confirmed") && item.date_start >= today).length}</strong></article>
        <article><span>Units</span><strong>{units?.length ?? 0}</strong></article>
        <article><span>Signed in as</span><strong className="admin-summary-role">{admin.role === "owner" ? "Owner" : "Staff"}</strong></article>
      </section>
      {saved && <p className="admin-message admin-message-success">Changes saved. The public pages now show the latest catalog.</p>}
      {error && <p className="admin-message admin-message-error">{errorMessages[error] ?? "Something went wrong. Try again or check the database connection."}</p>}
      {loadFailed && <p className="admin-message admin-message-error">Could not load resort data. Confirm that `supabase/schema.sql` has been run in this project.</p>}

      <section id="chats" className="admin-section">
        <div className="admin-section-heading"><div><p className="eyebrow">Guest support</p><h2>Live chats</h2></div><p>Reply to website visitors in real time. Open a conversation to mark guest messages as seen.</p></div>
        <AdminChatInbox />
      </section>

      <section id="bookings" className="admin-section">
        <div className="admin-section-heading"><div><p className="eyebrow">Guest requests</p><h2>Bookings</h2></div><p>Approve a request to start its configured payment deadline. A date is not held while a request is pending.</p></div>
        <ManualBookingForm packages={packages ?? []} units={units ?? []} />
        <div className="admin-booking-list">
          {(bookings ?? []).length === 0 && <p className="admin-empty-state">No booking requests yet.</p>}
          {(bookings ?? []).map((booking) => {
            const title = booking.type === "exclusive" ? packageNames.get(booking.package_id ?? "") ?? "Exclusive package" : booking.type === "unit" ? booking.unit_ids.map((id) => unitNames.get(id) ?? "Stay").join(", ") : "Entrance";
            const date = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(new Date(`${booking.date_start}T12:00:00+08:00`));
            return <article className="admin-booking-card" key={booking.id}>
              <div className="admin-booking-heading"><div><p className="eyebrow">{booking.ref_code} · {date}</p><h3>{booking.guest_name}</h3><p>{title} · {booking.adults + booking.children} guests</p></div><span className={`booking-status booking-status-${booking.status}`}>{booking.status.replaceAll("_", " ")}</span></div>
              <div className="admin-booking-details"><a href={`tel:${booking.phone.replace(/[^+\d]/g, "")}`}>{booking.phone}</a>{booking.guest_email && <a href={`mailto:${booking.guest_email}`}>{booking.guest_email}</a>}<strong>{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(booking.total_amount)}</strong></div>
              {booking.notes && <p className="admin-booking-notes">{booking.notes}</p>}
              {booking.deposit_required !== null && <p className="admin-help">Deposit requested: ₱{booking.deposit_required.toLocaleString("en-PH")} · Deadline {booking.payment_deadline ? new Date(booking.payment_deadline).toLocaleString("en-PH") : "not set"}</p>}
              <form className="admin-booking-actions" action={updateBookingStatusAction}><input type="hidden" name="booking_id" value={booking.id} />
                {booking.status === "pending" && <><button className="button button-blue" name="booking_action" value="approve">Approve</button><button className="button button-outline" name="booking_action" value="decline">Decline</button></>}
                {booking.status === "awaiting_payment" && <><button className="button button-blue" name="booking_action" value="paid">Mark paid</button><button className="button button-outline" name="booking_action" value="cancel">Cancel</button></>}
                {booking.status === "confirmed" && <><button className="button button-blue" name="booking_action" value="complete">Complete</button><button className="button button-outline" name="booking_action" value="cancel">Cancel</button></>}
              </form>
            </article>;
          })}
        </div>
      </section>

      <section id="blocked-dates" className="admin-section">
        <div className="admin-section-heading"><div><p className="eyebrow">Availability</p><h2>Closed dates</h2></div><p>Close a date for maintenance or private use. Guests see it as closed on the calendar and cannot request it.</p></div>
        <BlockedDatesPanel dates={blockedDates ?? []} />
      </section>

      <section id="units" className="admin-section">
        <div className="admin-section-heading"><div><p className="eyebrow">Places to stay</p><h2>Cottages and rooms</h2></div><p>Update a price or turn a listing on or off.</p></div>
        <div className="admin-editor-list">{(units ?? []).map((unit) => <UnitEditor key={unit.id} unit={unit} />)}</div>
      </section>
      <section id="packages" className="admin-section">
        <div className="admin-section-heading"><div><p className="eyebrow">Rates</p><h2>Packages and prices</h2></div><p>Prices are whole Philippine pesos. Edit names in all three languages.</p></div>
        <div className="admin-editor-list">{(packages ?? []).map((item) => <PackageEditor key={item.id} item={item} />)}</div>
      </section>
      {admin.role === "owner" && <section id="settings" className="admin-section">
        <div className="admin-section-heading"><div><p className="eyebrow">Owner only</p><h2>Resort settings</h2></div><p>Optional details can stay blank until confirmed.</p></div>
        <SettingsEditor settings={settings ?? []} owner />
      </section>}
      <footer className="admin-footer"><Link href="/">Back to the public website</Link></footer>
    </main>
  );
}
