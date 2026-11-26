"use client";

import { useState } from "react";
import { createManualBookingAction } from "./actions";
import { calculateCharges, withAdjustment, type BookingKind, type PricingCatalog, type VisitType } from "@/lib/booking-pricing";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

export function ManualBookingForm({ catalog }: { catalog: PricingCatalog }) {
  const exclusivePackages = catalog.packages.filter((item) => item.scope === "exclusive");
  const [kind, setKind] = useState<BookingKind>("unit");
  const [packageId, setPackageId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [visitType, setVisitType] = useState<VisitType>("day-tour");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [custom, setCustom] = useState(false);
  const [customTotal, setCustomTotal] = useState("");

  const charges = calculateCharges({ kind, packageId: packageId || null, unitId: unitId || null, visitType, adults, children }, catalog);
  const useCustom = custom || !charges.ok;
  const customValue = customTotal.trim() !== "" && /^\d+$/.test(customTotal.trim()) ? Number(customTotal) : null;
  const effectiveTotal = useCustom ? customValue : charges.ok ? charges.total : null;
  const previewLines = charges.ok ? (useCustom && customValue !== null ? withAdjustment(charges.lines, customValue, "") : charges.lines) : [];

  return (
    <details className="admin-edit-card">
      <summary><span>Add a booking by hand</span><span>For phone and Messenger bookings</span></summary>
      <form action={createManualBookingAction} className="admin-form admin-editor-form">
        <input type="hidden" name="total_mode" value={useCustom ? "custom" : "auto"} />
        <label>What was booked
          <select name="kind" value={kind} onChange={(event) => setKind(event.target.value as BookingKind)}>
            <option value="unit">Cottage or room</option><option value="exclusive">Whole resort</option><option value="entrance">Entrance only</option>
          </select>
        </label>
        {kind === "exclusive" && <label>Whole-resort package
          <select name="package_id" required value={packageId} onChange={(event) => setPackageId(event.target.value)}>
            <option value="">Choose a package</option>{exclusivePackages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>}
        {kind === "unit" && <label>Cottage or room
          <select name="unit_id" required value={unitId} onChange={(event) => setUnitId(event.target.value)}>
            <option value="">Choose a cottage or room</option>{catalog.units.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>}
        {kind === "entrance" && <label>Visit type
          <select name="visit_type" value={visitType} onChange={(event) => setVisitType(event.target.value as VisitType)}>
            <option value="day-tour">Day tour</option><option value="overnight">Overnight</option>
          </select>
        </label>}
        {kind !== "exclusive" && <input type="hidden" name="package_id" value="" />}
        {kind !== "unit" && <input type="hidden" name="unit_id" value="" />}
        <label>Date<input name="date" type="date" required /></label>
        <label>Adults<input name="adults" type="number" min={0} max={1000} value={adults} onChange={(event) => setAdults(Math.max(0, Math.floor(Number(event.target.value)) || 0))} required /></label>
        <label>Children ages 5–10<input name="children" type="number" min={0} max={1000} value={children} onChange={(event) => setChildren(Math.max(0, Math.floor(Number(event.target.value)) || 0))} required /></label>
        <label>Guest name<input name="guest_name" required maxLength={160} /></label>
        <label>Phone<input name="phone" type="tel" required maxLength={40} /></label>

        <div className="admin-field-wide admin-price-box" aria-live="polite">
          <div className="admin-price-box-heading"><strong>Price breakdown</strong><span>Calculated from the current prices</span></div>
          {charges.ok ? (
            <ul className="admin-price-lines">
              {previewLines.map((item, index) => (
                <li key={`${item.label}-${index}`}>
                  <div><strong>{item.label}</strong>{item.detail && <span>{item.detail}</span>}</div>
                  <span className="admin-price-qty">{item.quantity} × {peso.format(item.unit_price)}</span>
                  <b>{peso.format(item.amount)}</b>
                </li>
              ))}
            </ul>
          ) : <p className="admin-help">{charges.missing}</p>}
          <div className="admin-price-total"><span>Total</span><strong>{effectiveTotal === null ? "—" : peso.format(effectiveTotal)}</strong></div>
          {charges.ok && <label className="admin-checkbox">
            <input type="checkbox" checked={custom} onChange={(event) => {
              setCustom(event.target.checked);
              if (event.target.checked && customTotal === "") setCustomTotal(String(charges.total));
            }} />Change the total (discount or special price)
          </label>}
          {useCustom && <label>Total to charge (PHP, whole pesos)
            <input name="total" type="number" min={0} required value={customTotal} onChange={(event) => setCustomTotal(event.target.value)} />
          </label>}
        </div>

        <label>Status<select name="status" defaultValue="confirmed"><option value="confirmed">Confirmed (blocks the date)</option><option value="pending">Pending (does not block)</option></select></label>
        <label className="admin-field-wide">Notes<textarea name="notes" rows={2} maxLength={1000} /></label>
        <button className="button button-blue admin-field-wide" type="submit" disabled={effectiveTotal === null}>Save booking</button>
      </form>
    </details>
  );
}
