import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAdminContext } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { priceBooking } from "@/lib/booking-price";
import { normalizeCorkageItems, roundMoney, type PriceBreakdown } from "@/lib/pricing";
import { PrintButton } from "./print-button";

export const metadata = { title: "Booking receipt" };

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
const longDate = (value: string) => new Intl.DateTimeFormat("en-PH", { dateStyle: "full", timeZone: "Asia/Manila" }).format(new Date(`${value}T12:00:00+08:00`));
const statusLabels: Record<string, string> = { pending: "Pending approval", awaiting_payment: "Approved, awaiting payment", confirmed: "Confirmed", cancelled: "Cancelled", completed: "Completed" };

type ReceiptLine = { label: string; quantity: number; unit_price: number; amount: number; detail?: string };

function readBreakdown(value: unknown): PriceBreakdown | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { kind, total } = value as { kind?: unknown; total?: unknown };
  return (kind === "stay" || kind === "exclusive") && typeof total === "number" ? (value as PriceBreakdown) : null;
}

// Turns the saved price breakdown into receipt rows. If the admin typed a different total, an Adjustment row makes the receipt add up.
function linesFromBreakdown(b: PriceBreakdown, savedTotal: number): ReceiptLine[] {
  const lines: ReceiptLine[] = [];
  if (b.kind === "exclusive") {
    lines.push({ label: "Whole-resort package", quantity: 1, unit_price: b.packagePrice, amount: b.packagePrice, detail: b.paxIncluded !== null ? `Includes ${b.paxIncluded} guests` : undefined });
    if (b.extraGuests > 0) lines.push({ label: "Extra guests", quantity: b.extraGuests, unit_price: b.extraGuestFee ?? 0, amount: b.extraSubtotal });
  } else {
    for (const unit of b.unitLines) lines.push({ label: unit.name, quantity: unit.days, unit_price: unit.pricePerDay, amount: unit.subtotal, detail: `${unit.days} day${unit.days === 1 ? "" : "s"}` });
    if (b.adults > 0) lines.push({ label: "Adult entrance", quantity: b.adults * b.days, unit_price: b.adultFee, amount: roundMoney(b.adults * b.adultFee * b.days) });
    if (b.children > 0) lines.push({ label: "Child entrance (5–10)", quantity: b.children * b.days, unit_price: b.childFee, amount: roundMoney(b.children * b.childFee * b.days) });
    if (b.freeCredit > 0) lines.push({ label: "Free entrance with room", quantity: 1, unit_price: -b.freeCredit, amount: -b.freeCredit, detail: `${b.freeAdults} adult, ${b.freeChildren} child free per day` });
  }
  for (const item of b.corkageItems) lines.push({ label: item.label, quantity: 1, unit_price: item.amount, amount: item.amount, detail: "Corkage" });
  const diff = roundMoney(savedTotal - b.total);
  if (diff !== 0) lines.push({ label: "Adjustment", quantity: 1, unit_price: diff, amount: diff, detail: "Total set by the resort" });
  return lines;
}
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await cookies();
  if (!getSupabaseEnv()) redirect("/admin");
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?error=access");

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: booking } = await admin.supabase.from("bookings").select("*").eq("id", id).maybeSingle();
  if (!booking) notFound();

  const [packageRows, unitRows, phoneRow] = await Promise.all([
    admin.supabase.from("packages").select("id,name"),
    admin.supabase.from("units").select("id,name"),
    admin.supabase.from("settings").select("value").eq("key", "contact_phone").maybeSingle(),
  ]);
  const resortPhone = typeof phoneRow.data?.value === "string" ? phoneRow.data.value : null;

  const bookedName = booking.type === "exclusive"
    ? String(packageRows.data?.find((item) => item.id === booking.package_id)?.name ?? "Whole-resort booking")
    : booking.type === "unit"
      ? booking.unit_ids.map((unitId) => String(unitRows.data?.find((item) => item.id === unitId)?.name ?? "Cottage or room")).join(", ")
      : "Entrance";

  // The saved price breakdown is exactly what was charged. Older bookings without one are rebuilt from today's prices, but only when that adds up to the saved total.
  let breakdown = readBreakdown(booking.price_breakdown);
  let rebuilt = false;
  if (!breakdown) {
    const priced = await priceBooking(admin.supabase, booking, { adults: booking.adults, children: booking.children, corkage: normalizeCorkageItems(booking.corkage_items), useSnapshot: false });
    if (priced && roundMoney(priced.total) === roundMoney(booking.total_amount)) { breakdown = priced; rebuilt = true; }
  }
  const items: ReceiptLine[] = breakdown
    ? linesFromBreakdown(breakdown, booking.total_amount)
    : [{ label: bookedName, quantity: 1, unit_price: booking.total_amount, amount: booking.total_amount, detail: "Booking total" }];
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
          <div><dt>Guests</dt><dd>{booking.adults} adult{booking.adults === 1 ? "" : "s"}{booking.children > 0 ? `, ${booking.children} child${booking.children === 1 ? "" : "ren"} (5â€“10)` : ""} Â· {guestCount} total</dd></div>
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
