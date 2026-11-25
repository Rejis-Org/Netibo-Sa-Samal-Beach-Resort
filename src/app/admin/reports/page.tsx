import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { getAdminContext } from "@/lib/supabase/admin";
import { manilaToday } from "@/lib/booking-data";
import { addDays } from "@/lib/availability";
import { getDailyReport } from "@/lib/daily-report-data";
import { closeDayAction } from "../actions";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Daily report" };

type Props = { searchParams: Promise<{ date?: string; saved?: string; error?: string }> };

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2, minimumFractionDigits: 0 });
const roleLabel = { arrival: "Arriving", inhouse: "Staying", departure: "Leaving", single: "One day" } as const;

function validDate(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value);
}

export default async function DailyReportPage({ searchParams }: Props) {
  await cookies();
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?error=access");

  const today = manilaToday();
  const { date: dateParam, saved, error } = await searchParams;
  const date = validDate(dateParam) ? dateParam : today;
  const result = await getDailyReport(admin.supabase, date);
  const dateLabel = new Intl.DateTimeFormat("en-PH", { dateStyle: "full", timeZone: "Asia/Manila" }).format(new Date(`${date}T12:00:00+08:00`));
  const people = (adults: number, children: number) => `${adults + children} (${adults} adults, ${children} children)`;

  return (
    <main className="admin-shell report-page">
      <header className="admin-topbar no-print">
        <div><p className="eyebrow">Netibo sa Samal</p><h1>Daily report</h1></div>
        <div className="admin-account"><Link href="/admin#logbook">← Back to the logbook</Link></div>
      </header>
      {saved && <p className="admin-message admin-message-success no-print">The day was closed and saved.</p>}
      {error && <p className="admin-message admin-message-error no-print">That report could not be saved. Check the date and try again.</p>}

      <div className="report-toolbar no-print">
        <Link href={`/admin/reports?date=${addDays(date, -1)}`}>← Previous day</Link>
        <form method="get" className="report-date-form"><input type="date" name="date" defaultValue={date} aria-label="Report date" /><button className="button button-outline" type="submit">Show</button></form>
        <Link href={`/admin/reports?date=${addDays(date, 1)}`}>Next day →</Link>
        <PrintButton />
        <a className="button button-outline" href={`/admin/reports/export?date=${date}`}>Download CSV</a>
      </div>

      {!result ? <p className="admin-message admin-message-error">Could not load this report. Confirm that the latest <code>supabase/schema.sql</code> has been run.</p> : <>
        <section className="admin-section">
          <div className="admin-section-heading">
            <div><p className="eyebrow">{result.closedAt ? `Closed ${new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(result.closedAt))}` : date > today ? "Planned" : "Live, not closed yet"}</p><h2>{dateLabel}</h2></div>
            <p>{result.closedAt ? "This is the saved end-of-day report. Later price edits do not change it." : "Numbers update as bookings and the logbook change until the day is closed."}</p>
          </div>
          <div className="admin-summary-grid">
            <article><span>Arriving</span><strong>{result.report.counts.arrivals}</strong></article>
            <article><span>Stays today</span><strong>{result.report.counts.inHouse}</strong></article>
            <article><span>Leaving</span><strong>{result.report.counts.departures}</strong></article>
            <article><span>Places booked</span><strong>{result.report.counts.unitsBooked} of {result.report.counts.unitsTotal}</strong></article>
          </div>
          <p className="admin-help">Guests booked: {people(result.report.headcount.bookedAdults, result.report.headcount.bookedChildren)}</p>
          <p className="admin-help">Guests checked in during the day: {people(result.report.headcount.checkedInAdults, result.report.headcount.checkedInChildren)}</p>
          <p className="admin-help">Still in the resort at the end of the day: {people(result.report.headcount.stillInAdults, result.report.headcount.stillInChildren)}</p>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading"><div><p className="eyebrow">Rooms and cottages</p><h2>What was booked</h2></div></div>
          <div className="admin-grid-scroll"><table className="admin-grid report-table">
            <thead><tr><th scope="col">Place</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col">Guest</th><th scope="col">Reference</th></tr></thead>
            <tbody>{result.report.units.map((unit) => <tr key={unit.id} className={unit.state === "booked" ? "admin-cell-booked" : "admin-cell-free"}>
              <th scope="row">{unit.name}</th><td>{unit.type}</td><td>{unit.state === "booked" ? (unit.wholeResort ? "Whole resort" : "Booked") : "Vacant"}</td><td>{unit.guest ?? ""}</td><td>{unit.ref ?? ""}</td>
            </tr>)}</tbody>
          </table></div>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading"><div><p className="eyebrow">Bookings</p><h2>Everyone on the books today</h2></div></div>
          {result.report.bookings.length === 0 ? <p className="admin-empty-state">No confirmed bookings for this day.</p> : <div className="admin-grid-scroll"><table className="admin-grid report-table">
            <thead><tr><th scope="col">Guest</th><th scope="col">Booked</th><th scope="col">Today</th><th scope="col">Status</th><th scope="col">Guests</th><th scope="col">Booking total</th><th scope="col">Share for today</th></tr></thead>
            <tbody>{result.report.bookings.map((row) => <tr key={row.ref}>
              <th scope="row">{row.guest}<br /><small>{row.ref}</small></th><td>{row.title}</td><td>{roleLabel[row.role]}</td><td>{row.status.replaceAll("_", " ")}</td><td>{row.adults + row.children}</td><td>{peso.format(row.total)}</td><td>{peso.format(row.share)}</td>
            </tr>)}</tbody>
          </table></div>}
        </section>

        <section className="admin-section">
          <div className="admin-section-heading"><div><p className="eyebrow">Sales</p><h2>{peso.format(result.report.sales.total)}</h2></div><p>Each booking&apos;s share for this day, not cash received. Multi-day rooms and entrance are split evenly per day; corkage and whole-resort packages count on the first day.</p></div>
          <ul className="admin-price-breakdown">
            <li><span>Rooms and cottages</span><span>{peso.format(result.report.sales.rooms)}</span></li>
            <li><span>Entrance fees</span><span>{peso.format(result.report.sales.entrance)}</span></li>
            <li><span>Whole-resort packages</span><span>{peso.format(result.report.sales.packages)}</span></li>
            <li><span>Corkage</span><span>{peso.format(result.report.sales.corkage)}</span></li>
            {result.report.sales.other > 0 && <li><span>Other (totals edited by hand or without a price breakdown)</span><span>{peso.format(result.report.sales.other)}</span></li>}
          </ul>
        </section>

        {date <= today && <form action={closeDayAction} className="report-close no-print">
          <input type="hidden" name="date" value={date} />
          <button className="button button-blue" type="submit">{result.closedAt ? "Update the saved report" : "Close the day and save this report"}</button>
          <p className="admin-help">{result.closedAt ? "Saves the numbers as they stand now over the earlier snapshot." : "Saves a snapshot so this day never changes, even if prices are edited later."}</p>
        </form>}
      </>}
    </main>
  );
}
