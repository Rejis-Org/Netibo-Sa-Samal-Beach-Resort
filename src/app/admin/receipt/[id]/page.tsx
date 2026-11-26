import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAdminContext } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { calculateCharges, catalogFromRows, parseLineItems, type BookingKind, type ChargeLine, type VisitType } from "@/lib/booking-pricing";
import { PrintButton } from "./print-button";

export const metadata = { title: "Booking receipt" };

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
const longDate = (value: string) => new Intl.DateTimeFormat("en-PH", { dateStyle: "full", timeZone: "Asia/Manila" }).format(new Date(`${value}T12:00:00+08:00`));
const statusLabels: Record<string, string> = { pending: "Pending approval", awaiting_payment: "Approved, awaiting payment", confirmed: "Confirmed", cancelled: "Cancelled", completed: "Completed" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await cookies();
  if (!getSupabaseEnv()) redirect("/admin");
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?error=access");

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: booking } = await admin.supabase.from("bookings").select("*").eq("id", id).maybeSingle();
  if (!booking) notFound();

  const [packageRows, unitRows, feeRow, phoneRow] = await Promise.all([
    admin.supabase.from("packages").select("id,slug,name,scope,price_amount,pax_included"),
    admin.supabase.from("units").select("id,name,price_amount"),
    admin.supabase.from("settings").select("value").eq("key", "extra_guest_fee").maybeSingle(),
    admin.supabase.from("settings").select("value").eq("key", "contact_phone").maybeSingle(),
  ]);
  const catalog = catalogFromRows(packageRows.data ?? [], unitRows.data ?? [], feeRow.data?.value);
  const resortPhone = typeof phoneRow.data?.value === "string" ? phoneRow.data.value : null;

  const bookedName = booking.type === "exclusive"
    ? catalog.packages.find((item) => item.id === booking.package_id)?.name ?? "Whole-resort booking"
    : booking.type === "unit"
      ? booking.unit_ids.map((unitId) => catalog.units.find((item) => item.id === unitId)?.name ?? "Cottage or room").join(", ")
      : "Entrance";

  // Newer bookings keep the exact prices that were charged. Older ones are rebuilt from today's prices when they add up.
  let lines: ChargeLine[] | null = parseLineItems(booking.line_items);
  let rebuilt = false;
  if (!lines) {
    const visitTypes: VisitType[] = booking.type === "entrance" ? ["day-tour", "overnight"] : ["day-tour"];
    for (const visitType of visitTypes) {
      const result = calculateCharges({
        kind: booking.type as BookingKind, packageId: booking.package_id, unitId: booking.unit_ids[0] ?? null,
        visitType, adults: booking.adults, children: booking.children,
      }, catalog);
      if (result.ok && result.total === booking.total_amount) { lines = result.lines; rebuilt = true; break; }
    }
  }
  const items: ChargeLine[] = lines ?? [{ label: bookedName, quantity: 1, unit_price: booking.total_amount, amount: booking.total_amount, detail: "Booking total" }];
  const guestCount = booking.adults + booking.children;

  return (
    <main className="receipt-page">
      <div className="receipt-actions">
        <Link className="button button-outline" href="/admin/bookings">Back to bookings</Link>
        <PrintButton />
      </div>
      <article className="receipt-sheet">
        <header className="receipt-header">
          <div>
            <p className="eyebrow">Booking receipt</p>
            <h1>Netibo sa Samal Beach Resort</h1>
            {resortPhone && <p className="receipt-muted">Contact: {resortPhone}</p>}
          </div>
          <div className="receipt-ref"><span>Receipt no.</span><strong>{booking.ref_code}</strong></div>
        </header>

        <dl className="receipt-meta">
          <div><dt>Guest</dt><dd>{booking.guest_name}</dd></div>
          <div><dt>Phone</dt><dd>{booking.phone}</dd></div>
          <div><dt>Booking date</dt><dd>{longDate(booking.date_start)}</dd></div>
          <div><dt>Booked</dt><dd>{bookedName}</dd></div>
          <div><dt>Guests</dt><dd>{booking.adults} adult{booking.adults === 1 ? "" : "s"}{booking.children > 0 ? `, ${booking.children} child${booking.children === 1 ? "" : "ren"} (5–10)` : ""} · {guestCount} total</dd></div>
          <div><dt>Status</dt><dd>{statusLabels[booking.status] ?? booking.status}</dd></div>
        </dl>

        <table className="receipt-table">
          <thead><tr><th>Description</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.label}-${index}`}>
                <td><strong>{item.label}</strong>{item.detail && <span>{item.detail}</span>}</td>
                <td>{item.quantity}</td>
                <td>{peso.format(item.unit_price)}</td>
                <td>{peso.format(item.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={3}>Total</td><td>{peso.format(booking.total_amount)}</td></tr></tfoot>
        </table>

        {booking.deposit_required !== null && <p className="receipt-muted">Deposit requested: {peso.format(booking.deposit_required)}</p>}
        {rebuilt && <p className="receipt-muted receipt-fineprint">Itemized using the resort&apos;s current prices.</p>}
        <footer className="receipt-footer">
          <p>Please keep this receipt. Show it if there is ever a question about what was booked or charged.</p>
          <p className="receipt-fineprint">Recorded on {new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(booking.created_at))}</p>
        </footer>
      </article>
    </main>
  );
}
