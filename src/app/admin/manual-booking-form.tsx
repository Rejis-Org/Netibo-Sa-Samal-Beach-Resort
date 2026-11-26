"use client";

import { useState } from "react";
import { createManualBookingAction } from "./actions";
import { dayCount, unitsTakenInRange, type UnitAvailabilityRow } from "@/lib/availability";
import { MAX_CORKAGE_ROWS, parseCorkageRows, priceExclusive, priceStay } from "@/lib/pricing";
import type { EntranceFees } from "@/lib/booking-data";

type Props = {
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
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2, minimumFractionDigits: 0 });
const blank = (key: number): Row => ({ key, label: "", amount: "" });

/** Phone, Messenger and walk-in bookings. Uses the same availability and price rules as the public form. */
export function ManualBookingForm({ packages, units, unitRows, entranceFees, extraGuestFee, today, walkIn = false }: Props) {
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
  const corkage = parseCorkageRows(rows.map((row) => row.label), rows.map((row) => row.amount));
  const fees = entranceFees[visitType];
  const selectedPackage = packages.find((item) => item.id === packageId);

  let total: number | null = null;
  if (kind === "exclusive") {
    if (selectedPackage?.price != null) {
      const priced = priceExclusive({ packagePrice: selectedPackage.price, paxIncluded: selectedPackage.paxIncluded, extraGuestFee, guests: adults + children, corkage: corkage.items });
      if (priced.ok) total = priced.breakdown.total;
    }
  } else if (fees.adult !== null && fees.child !== null && (kind === "entrance" || (chosenUnits.length > 0 && stayDays > 0))) {
    const priced = priceStay({
      days: kind === "entrance" ? 1 : stayDays, adults, children,
      units: kind === "entrance" ? [] : chosenUnits.map((unit) => ({ id: unit.id, name: unit.name, price: unit.price ?? 0, freeEntrances: unit.freeEntranceCount })),
      adultFee: fees.adult, childFee: fees.child, corkage: corkage.items,
    });
    if (priced.ok) total = priced.breakdown.total;
  }

  function edit(key: number, field: "label" | "amount", value: string) {
    const next = rows.map((row) => (row.key === key ? { ...row, [field]: value } : row));
    const last = next[next.length - 1];
    if ((last.label || last.amount) && next.length < MAX_CORKAGE_ROWS) { setRows([...next, blank(nextKey)]); setNextKey(nextKey + 1); } else setRows(next);
  }

  const canSubmit = Boolean(start) && adults + children >= 1 && !corkage.invalid && !(kind === "unit" && chosen.length === 0) && !(kind === "exclusive" && !packageId);

  return (
    <details className="admin-edit-card" open={walkIn || undefined}>
      <summary><span>{walkIn ? "Add a walk-in" : "Add a booking by hand"}</span><span>{walkIn ? "Booked and checked in now" : "For phone and Messenger bookings"}</span></summary>
      <form action={createManualBookingAction} className="admin-form admin-editor-form">
        <input type="hidden" name="kind" value={kind} />
        {walkIn && <><input type="hidden" name="status" value="confirmed" /><input type="hidden" name="check_in_now" value="on" /></>}
        <label>What was booked<select value={kind} onChange={(event) => { setKind(event.target.value); if (event.target.value !== "unit") setEnd(""); }}>
          <option value="unit">Cottage or room</option><option value="entrance">Entrance only</option><option value="exclusive">Whole resort</option>
        </select></label>
        {kind === "exclusive"
          ? <label>Whole-resort package<select name="package_id" value={packageId} onChange={(event) => setPackageId(event.target.value)}>{packages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          : <label>Visit type<select name="visit_type" value={visitType} onChange={(event) => setVisitType(event.target.value === "overnight" ? "overnight" : "day-tour")}><option value="day-tour">Day tour</option><option value="overnight">Overnight</option></select></label>}
        <label>{multiDay ? "First day" : "Date"}<input name="date" type="date" required min={today} value={start} readOnly={walkIn} onChange={(event) => { setStart(event.target.value); if (end && event.target.value > end) setEnd(""); }} /></label>
        {multiDay && <label>Last day (blank for one day)<input name="date_end" type="date" min={start || today} value={end} onChange={(event) => setEnd(event.target.value)} /></label>}
        {kind === "unit" && <fieldset className="admin-field-wide admin-unit-picker">
          <legend>Cottages and rooms</legend>
          {bookable.map((unit) => {
            const blocked = taken.get(unit.id);
            return <label key={unit.id} className={`admin-checkbox${blocked ? " admin-unit-taken" : ""}`}>
              <input type="checkbox" name="unit_id" value={unit.id} checked={chosen.includes(unit.id)} disabled={Boolean(blocked)}
                onChange={() => setSelected(chosen.includes(unit.id) ? chosen.filter((id) => id !== unit.id) : [...chosen, unit.id])} />
              {unit.name} · {peso.format(unit.price ?? 0)}{blocked ? ` · not available from ${blocked.firstDate}` : ""}
            </label>;
          })}
          {!start && <p className="admin-help">Pick the dates first to see which places are free.</p>}
        </fieldset>}
        <label>Adults<input name="adults" type="number" min={0} max={1000} value={adults} onChange={(event) => setAdults(Number(event.target.value))} required /></label>
        <label>Children ages 5–10<input name="children" type="number" min={0} max={1000} value={children} onChange={(event) => setChildren(Number(event.target.value))} required /></label>
        <label>Guest name<input name="guest_name" required maxLength={160} /></label>
        <label>Phone<input name="phone" type="tel" required maxLength={40} /></label>
        <div className="admin-field-wide admin-corkage-rows">
          <p className="admin-help">Corkage: item and fee. A new row appears when you fill the last one.</p>
          {rows.map((row) => <div className="admin-corkage-row" key={row.key}>
            <input name="corkage_label" maxLength={80} placeholder="Item" value={row.label} onChange={(event) => edit(row.key, "label", event.target.value)} />
            <input name="corkage_amount" type="number" min={0} step="any" placeholder="Fee (PHP)" value={row.amount} onChange={(event) => edit(row.key, "amount", event.target.value)} />
          </div>)}
        </div>
        <label>Total (PHP) — blank uses the automatic total<input name="total" type="number" min={0} step="0.01" placeholder={total === null ? "Set prices first" : String(total)} /></label>
        {!walkIn && <label>Status<select name="status" defaultValue="confirmed"><option value="confirmed">Confirmed (blocks the date)</option><option value="pending">Pending (does not block)</option></select></label>}
        <label className="admin-field-wide">Notes<textarea name="notes" rows={2} maxLength={1000} /></label>
        <p className="admin-help admin-field-wide">Automatic total: <strong>{total === null ? "not available yet" : peso.format(total)}</strong>{kind !== "exclusive" && (fees.adult === null || fees.child === null) ? " (the entrance fees are missing from Packages and prices)" : ""}</p>
        <button className="button button-blue admin-field-wide" type="submit" disabled={!canSubmit}>{walkIn ? "Save and check in" : "Save booking"}</button>
      </form>
    </details>
  );
}
