import type { Database } from "@/lib/supabase/database.types";
import { peso } from "@/app/admin/_lib/format";
import type { ReceiptLine } from "@/app/admin/_lib/receipt-lines";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export function ReceiptTable({ items, booking }: { items: ReceiptLine[]; booking: Booking }) {
  return (
    <table className="receipt-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={`${item.label}-${index}`}>
            <td>
              <strong>{item.label}</strong>
              {item.detail && <span>{item.detail}</span>}
            </td>
            <td>{item.quantity}</td>
            <td>{peso.format(item.unit_price)}</td>
            <td>{peso.format(item.amount)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3}>Total</td>
          <td>{peso.format(booking.total_amount)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
