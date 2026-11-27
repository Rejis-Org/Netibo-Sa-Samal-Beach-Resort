import { roundMoney, type PriceBreakdown } from "@/lib/pricing";

export type ReceiptLine = { label: string; quantity: number; unit_price: number; amount: number; detail?: string };

export function readBreakdown(value: unknown): PriceBreakdown | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { kind, total } = value as { kind?: unknown; total?: unknown };
  return (kind === "stay" || kind === "exclusive") && typeof total === "number" ? (value as PriceBreakdown) : null;
}

// Turns the saved price breakdown into receipt rows. If the admin typed a different total, an Adjustment row makes the receipt add up.
export function linesFromBreakdown(b: PriceBreakdown, savedTotal: number): ReceiptLine[] {
  const lines: ReceiptLine[] = [];
  if (b.kind === "exclusive") {
    lines.push({
      label: "Whole-resort package",
      quantity: 1,
      unit_price: b.packagePrice,
      amount: b.packagePrice,
      detail: b.paxIncluded !== null ? `Includes ${b.paxIncluded} guests` : undefined,
    });
    if (b.extraGuests > 0)
      lines.push({
        label: "Extra guests",
        quantity: b.extraGuests,
        unit_price: b.extraGuestFee ?? 0,
        amount: b.extraSubtotal,
      });
  } else {
    for (const unit of b.unitLines)
      lines.push({
        label: unit.name,
        quantity: unit.days,
        unit_price: unit.pricePerDay,
        amount: unit.subtotal,
        detail: `${unit.days} day${unit.days === 1 ? "" : "s"}`,
      });
    if (b.adults > 0)
      lines.push({
        label: "Adult entrance",
        quantity: b.adults * b.days,
        unit_price: b.adultFee,
        amount: roundMoney(b.adults * b.adultFee * b.days),
      });
    if (b.children > 0)
      lines.push({
        label: "Child entrance (5–10)",
        quantity: b.children * b.days,
        unit_price: b.childFee,
        amount: roundMoney(b.children * b.childFee * b.days),
      });
    if (b.freeCredit > 0)
      lines.push({
        label: "Free entrance with room",
        quantity: 1,
        unit_price: -b.freeCredit,
        amount: -b.freeCredit,
        detail: `${b.freeAdults} adult, ${b.freeChildren} child free per day`,
      });
  }
  for (const item of b.corkageItems)
    lines.push({ label: item.label, quantity: 1, unit_price: item.amount, amount: item.amount, detail: "Corkage" });
  const diff = roundMoney(savedTotal - b.total);
  if (diff !== 0)
    lines.push({ label: "Adjustment", quantity: 1, unit_price: diff, amount: diff, detail: "Total set by the resort" });
  return lines;
}
