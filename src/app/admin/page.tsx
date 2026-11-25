import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAdminContext } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { logoutAction, updateBookingStatusAction } from "./actions";
import { BlockedDatesPanel, CorkagePresetsEditor, EditBookingForm, ExtendBookingForm, PackageEditor, SettingsEditor, UnitEditor, breakdownSummary } from "./editor-forms";
import { AdminChatInbox } from "./chat-inbox";
import { manilaToday, getBookingOptions } from "@/lib/booking-data";
import { expireUnpaidHolds } from "@/lib/booking-maintenance";
import { addDays, maxExtensionDays } from "@/lib/availability";
import { normalizeCorkageItems } from "@/lib/pricing";
import { AvailabilityGrid } from "./availability-grid";
import { ManualBookingForm } from "./manual-booking-form";
import { Logbook, type ExpectedGuest, type LogbookEntry } from "./logbook";

type AdminPageProps = { searchParams: Promise<{ error?: string; saved?: string; from?: string }> };

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
  extend: "That stay could not be extended. Only confirmed or awaiting-payment room bookings can be extended.",
  extendConflict: "Those extra days are already booked or closed, so the stay was not extended.",
  price: "The price could not be calculated because a price or entrance fee is missing. Check the catalog and try again.",
  checkin: "That check-in or check-out could not be saved. Refresh the logbook and try again.",
  alreadyIn: "That booking is already checked in.",
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
  const { error, saved, from: fromParam } = await searchParams;
  // Bookings that still matter for the next weeks: used by the availability grid and to see how far a stay can be extended.
  const { data: openBookings } = await admin.supabase.from("bookings").select("*").gte("date_end", today).in("status", ["pending", "awaiting_payment", "confirmed"]);
  const closedDates = (blockedDates ?? []).map((item) => item.date);
  const gridFrom = fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam) && fromParam > today ? fromParam : today;
  const loadFailed = unitsError || packagesError || bookingsError || settingsError || blockedError;
  const packageNames = new Map((packages ?? []).map((item) => [item.id, typeof item.name === "object" && item.name && !Array.isArray(item.name) && typeof item.name.en === "string" ? item.name.en : item.slug]));
  const unitNames = new Map((units ?? []).map((item) => [item.id, item.name]));
  const pendingCount = (bookings ?? []).filter((item) => item.status === "pending").length;
  const unreadBookingCount = pendingCount;

  // Booking form data: current prices, plus which places are taken over the next four months.
  const options = await getBookingOptions("en");
  const { data: unitRowsData } = await admin.supabase.rpc("get_unit_availability", { from_date: today, through_date: addDays(today, 120) });
  const unitRows = unitRowsData ?? [];

  // Logbook: who is in, who is booked for today but has not arrived, and who left today.
  type PartyBooking = NonNullable<typeof openBookings>[number];
  const dayStartIso = new Date(`${today}T00:00:00+08:00`).toISOString();
  const [{ data: openLogs }, { data: leftLogs }, { data: coveringToday }] = await Promise.all([
    admin.supabase.from("guest_log").select("*").is("checked_out_at", null).order("checked_in_at"),
    admin.supabase.from("guest_log").select("*").gte("checked_out_at", dayStartIso).order("checked_out_at"),
    admin.supabase.from("bookings").select("*").lte("date_start", today).gte("date_end", today).in("status", ["awaiting_payment", "confirmed"]).order("guest_name"),
  ]);
  const coveringIds = (coveringToday ?? []).map((item) => item.id);
  const { data: coveringLogs } = coveringIds.length ? await admin.supabase.from("guest_log").select("booking_id").in("booking_id", coveringIds) : { data: [] as { booking_id: string }[] };
  const loggedIds = new Set((coveringLogs ?? []).map((item) => item.booking_id));
  const partyById = new Map<string, PartyBooking>((coveringToday ?? []).map((item) => [item.id, item]));
  const missingIds = [...new Set([...(openLogs ?? []), ...(leftLogs ?? [])].map((item) => item.booking_id).filter((id) => !partyById.has(id)))];
  if (missingIds.length) {
    const { data: extraBookings } = await admin.supabase.from("bookings").select("*").in("id", missingIds);
    for (const item of extraBookings ?? []) partyById.set(item.id, item);
  }
  const titleOf = (item: { type: string; package_id: string | null; unit_ids: string[] }) => item.type === "exclusive" ? packageNames.get(item.package_id ?? "") ?? "Whole resort" : item.type === "unit" ? item.unit_ids.map((id) => unitNames.get(id) ?? "Stay").join(", ") : "Entrance only";
  const toEntry = (log: NonNullable<typeof openLogs>[number]): LogbookEntry | null => {
    const party = partyById.get(log.booking_id);
    return party ? { logId: log.id, guest: party.guest_name, phone: party.phone, title: titleOf(party), adults: log.actual_adults, children: log.actual_children, checkedInAt: log.checked_in_at, checkedOutAt: log.checked_out_at, stayEnd: party.date_end } : null;
  };
  const inResort = (openLogs ?? []).map(toEntry).filter((entry): entry is LogbookEntry => entry !== null);
  const leftToday = (leftLogs ?? []).map(toEntry).filter((entry): entry is LogbookEntry => entry !== null);
  const expectedGuests: ExpectedGuest[] = (coveringToday ?? []).filter((item) => !loggedIds.has(item.id)).map((item) => ({ bookingId: item.id, guest: item.guest_name, phone: item.phone, title: titleOf(item), status: item.status, adults: item.adults, children: item.children, stayStart: item.date_start, stayEnd: item.date_end }));

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div><p className="eyebrow">Netibo sa Samal</p><h1>Resort admin</h1></div>
        <div className="admin-account"><span>{admin.email} · {admin.role}</span><form action={logoutAction}><button className="admin-text-button" type="submit">Sign out</button></form></div>
      </header>
      <nav className="admin-nav" aria-label="Admin sections">
        <a href="#chats">Chats</a><a href="#availability">Availability</a><a href="#logbook">Logbook</a><a href="#bookings">Bookings</a><a href="#blocked-dates">Closed dates</a><a href="#units">Cottages and rooms</a><a href="#packages">Packages and prices</a>{admin.role === "owner" && <a href="#settings">Resort settings</a>}
        <Link href="/admin/reports">Daily report</Link>
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

      <section id="availability" className="admin-section">
        <div className="admin-section-heading"><div><p className="eyebrow">Rooms and cottages</p><h2>Availability</h2></div><p>See which place is taken on which day. A place is free unless a booking or a closed date covers it.</p></div>
        <AvailabilityGrid units={(units ?? []).filter((unit) => unit.active)} bookings={openBookings ?? []} blockedDates={closedDates} from={gridFrom} today={today} />
      </section>

      <section id="logbook" className="admin-section">
        <div className="admin-section-heading"><div><p className="eyebrow">Today at the resort</p><h2>Guest logbook</h2></div><p>Check guests in when they arrive and out when they leave. The end-of-day report is built from this.</p></div>
        {options && <ManualBookingForm walkIn packages={options.packages.filter((item) => item.scope === "exclusive" && item.price !== null).map((item) => ({ id: item.id, name: item.name, price: item.price, paxIncluded: item.paxIncluded }))} units={options.units.map((item) => ({ id: item.id, name: item.name, price: item.price, freeEntranceCount: item.freeEntranceCount }))} unitRows={unitRows} entranceFees={options.entranceFees} extraGuestFee={options.extraGuestFee} today={today} />}
        <Logbook inResort={inResort} expected={expectedGuests} leftToday={leftToday} today={today} />
      </section>

      <section id="bookings" className="admin-section">
        <div className="admin-section-heading"><div><p className="eyebrow">Guest requests</p><h2>Bookings</h2></div><p>Approve a request to start its configured payment deadline. A date is not held while a request is pending.</p></div>
        {options && <ManualBookingForm packages={options.packages.filter((item) => item.scope === "exclusive" && item.price !== null).map((item) => ({ id: item.id, name: item.name, price: item.price, paxIncluded: item.paxIncluded }))} units={options.units.map((item) => ({ id: item.id, name: item.name, price: item.price, freeEntranceCount: item.freeEntranceCount }))} unitRows={unitRows} entranceFees={options.entranceFees} extraGuestFee={options.extraGuestFee} today={today} />}
        <div className="admin-booking-list">
          {(bookings ?? []).length === 0 && <p className="admin-empty-state">No booking requests yet.</p>}
          {(bookings ?? []).map((booking) => {
            const title = booking.type === "exclusive" ? packageNames.get(booking.package_id ?? "") ?? "Exclusive package" : booking.type === "unit" ? booking.unit_ids.map((id) => unitNames.get(id) ?? "Stay").join(", ") : "Entrance";
            const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });
            const startLabel = dateFormat.format(new Date(`${booking.date_start}T12:00:00+08:00`));
            const date = booking.date_end > booking.date_start ? `${startLabel} – ${dateFormat.format(new Date(`${booking.date_end}T12:00:00+08:00`))}` : startLabel;
            const canExtend = booking.type === "unit" && (booking.status === "confirmed" || booking.status === "awaiting_payment") && booking.date_end >= today;
            const extendDays = canExtend ? maxExtensionDays({ booking, bookings: openBookings ?? [], blockedDates: closedDates }) : 0;
            const summary = breakdownSummary(booking.price_breakdown);
            return <article className="admin-booking-card" key={booking.id}>
              <div className="admin-booking-heading"><div><p className="eyebrow">{booking.ref_code} · {date}</p><h3>{booking.guest_name}</h3><p>{title} · {booking.adults + booking.children} guests</p></div><span className={`booking-status booking-status-${booking.status}`}>{booking.status.replaceAll("_", " ")}</span></div>
              <div className="admin-booking-details"><a href={`tel:${booking.phone.replace(/[^+\d]/g, "")}`}>{booking.phone}</a>{booking.guest_email && <a href={`mailto:${booking.guest_email}`}>{booking.guest_email}</a>}<strong>{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(booking.total_amount)}</strong></div>
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
        <CorkagePresetsEditor presets={normalizeCorkageItems((settings ?? []).find((item) => item.key === "corkage_presets")?.value)} />
      </section>}
      <footer className="admin-footer"><Link href="/">Back to the public website</Link></footer>
    </main>
  );
}
