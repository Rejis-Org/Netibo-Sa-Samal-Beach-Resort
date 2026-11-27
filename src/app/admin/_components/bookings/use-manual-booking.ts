import { useState } from "react";
import { dayCount, unitsTakenInRange, type UnitAvailabilityRow } from "@/lib/availability";
import { MAX_CORKAGE_ROWS, parseCorkageRows, priceExclusive, priceStay } from "@/lib/pricing";
import type { EntranceFees } from "@/lib/booking-data";

export type ManualBookingProps = {
  packages: { id: string; name: string; price: number | null; paxIncluded: number | null }[];
  units: { id: string; name: string; price: number | null; freeEntranceCount: number }[];
  unitRows: UnitAvailabilityRow[];
  entranceFees: EntranceFees;
  extraGuestFee: number | null;
  today: string;
  /** Walk-in mode: today only, confirmed, and the guest is checked in right away. */
  walkIn?: boolean;
};

type Row = { key: number; label: string; amount: string };
const blank = (key: number): Row => ({ key, label: "", amount: "" });

export function useManualBooking({
  packages,
  units,
  unitRows,
  entranceFees,
  extraGuestFee,
  today,
  walkIn = false,
}: ManualBookingProps) {
  const [kind, setKind] = useState("unit");
  const [packageId, setPackageId] = useState(packages[0]?.id ?? "");
  const [visitType, setVisitType] = useState<"day-tour" | "overnight">("day-tour");
  const [start, setStart] = useState(walkIn ? today : "");
  const [end, setEnd] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [rows, setRows] = useState<Row[]>([blank(1)]);
  const [nextKey, setNextKey] = useState(2);

  const bookable = units.filter((unit) => unit.price !== null);
  const multiDay = kind === "unit";
  const lastDay = multiDay && end && end >= start ? end : start;
  const stayDays = start ? dayCount(start, lastDay) : 0;
  const taken: ReturnType<typeof unitsTakenInRange> = start ? unitsTakenInRange(unitRows, start, lastDay) : new Map();
  const chosen = selected.filter((id) => !taken.has(id) && bookable.some((unit) => unit.id === id));
  const chosenUnits = bookable.filter((unit) => chosen.includes(unit.id));
  const corkage = parseCorkageRows(
    rows.map((row) => row.label),
    rows.map((row) => row.amount),
  );
  const fees = entranceFees[visitType];
  const selectedPackage = packages.find((item) => item.id === packageId);

  let total: number | null = null;
  if (kind === "exclusive") {
    if (selectedPackage?.price != null) {
      const priced = priceExclusive({
        packagePrice: selectedPackage.price,
        paxIncluded: selectedPackage.paxIncluded,
        extraGuestFee,
        guests: adults + children,
        corkage: corkage.items,
      });
      if (priced.ok) total = priced.breakdown.total;
    }
  } else if (
    fees.adult !== null &&
    fees.child !== null &&
    (kind === "entrance" || (chosenUnits.length > 0 && stayDays > 0))
  ) {
    const priced = priceStay({
      days: kind === "entrance" ? 1 : stayDays,
      adults,
      children,
      units:
        kind === "entrance"
          ? []
          : chosenUnits.map((unit) => ({
              id: unit.id,
              name: unit.name,
              price: unit.price ?? 0,
              freeEntrances: unit.freeEntranceCount,
            })),
      adultFee: fees.adult,
      childFee: fees.child,
      corkage: corkage.items,
    });
    if (priced.ok) total = priced.breakdown.total;
  }

  function edit(key: number, field: "label" | "amount", value: string) {
    const next = rows.map((row) => (row.key === key ? { ...row, [field]: value } : row));
    const last = next[next.length - 1];
    if ((last.label || last.amount) && next.length < MAX_CORKAGE_ROWS) {
      setRows([...next, blank(nextKey)]);
      setNextKey(nextKey + 1);
    } else setRows(next);
  }

  const canSubmit =
    Boolean(start) &&
    adults + children >= 1 &&
    !corkage.invalid &&
    !(kind === "unit" && chosen.length === 0) &&
    !(kind === "exclusive" && !packageId);
  return {
    kind,
    setKind,
    packageId,
    setPackageId,
    visitType,
    setVisitType,
    start,
    setStart,
    end,
    setEnd,
    setSelected,
    adults,
    setAdults,
    children,
    setChildren,
    rows,
    bookable,
    multiDay,
    taken,
    chosen,
    fees,
    total,
    edit,
    canSubmit,
  };
}
