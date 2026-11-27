import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAdminContext } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { priceBooking } from "@/lib/booking-price";
import { normalizeCorkageItems, roundMoney } from "@/lib/pricing";
import { PrintButton } from "@/app/admin/_components/receipt/print-button";
import { ReceiptMeta } from "@/app/admin/_components/receipt/receipt-meta";
import { ReceiptTable } from "@/app/admin/_components/receipt/receipt-table";
import { formatLongDateTime, peso } from "@/app/admin/_lib/format";
import { linesFromBreakdown, readBreakdown, type ReceiptLine } from "@/app/admin/_lib/receipt-lines";

export const metadata = { title: "Booking receipt" };

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

  const bookedName =
    booking.type === "exclusive"
      ? String(packageRows.data?.find((item) => item.id === booking.package_id)?.name ?? "Whole-resort booking")
      : booking.type === "unit"
        ? booking.unit_ids
            .map((unitId) => String(unitRows.data?.find((item) => item.id === unitId)?.name ?? "Cottage or room"))
            .join(", ")
        : "Entrance";

  // The saved price breakdown is exactly what was charged. Older bookings without one are rebuilt from today's prices, but only when that adds up to the saved total.
  let breakdown = readBreakdown(booking.price_breakdown);
  let rebuilt = false;
  if (!breakdown) {
    const priced = await priceBooking(admin.supabase, booking, {
      adults: booking.adults,
      children: booking.children,
      corkage: normalizeCorkageItems(booking.corkage_items),
      useSnapshot: false,
    });
    if (priced && roundMoney(priced.total) === roundMoney(booking.total_amount)) {
      breakdown = priced;
      rebuilt = true;
    }
  }
  const items: ReceiptLine[] = breakdown
    ? linesFromBreakdown(breakdown, booking.total_amount)
    : [
        {
          label: bookedName,
          quantity: 1,
          unit_price: booking.total_amount,
          amount: booking.total_amount,
          detail: "Booking total",
        },
      ];

  return (
    <main className="receipt-page">
      <div className="receipt-actions">
        <Link className="button button-outline" href="/admin/bookings">
          Back to bookings
        </Link>
        <PrintButton />
      </div>
      <article className="receipt-sheet">
        <header className="receipt-header">
          <div>
            <p className="eyebrow">Booking receipt</p>
            <h1>Netibo sa Samal Beach Resort</h1>
            {resortPhone && <p className="receipt-muted">Contact: {resortPhone}</p>}
          </div>
          <div className="receipt-ref">
            <span>Receipt no.</span>
            <strong>{booking.ref_code}</strong>
          </div>
        </header>

        <ReceiptMeta booking={booking} bookedName={bookedName} />

        <ReceiptTable items={items} booking={booking} />

        {booking.deposit_required !== null && (
          <p className="receipt-muted">Deposit requested: {peso.format(booking.deposit_required)}</p>
        )}
        {rebuilt && <p className="receipt-muted receipt-fineprint">Itemized using the resort&apos;s current prices.</p>}
        <footer className="receipt-footer">
          <p>Please keep this receipt. Show it if there is ever a question about what was booked or charged.</p>
          <p className="receipt-fineprint">Recorded on {formatLongDateTime(booking.created_at)}</p>
        </footer>
      </article>
    </main>
  );
}
