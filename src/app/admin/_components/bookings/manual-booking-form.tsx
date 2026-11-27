"use client";

import { createManualBookingAction } from "@/app/admin/_actions/bookings";
import { peso } from "@/app/admin/_lib/format";
import { CorkageRows } from "@/app/admin/_components/bookings/corkage-rows";
import { UnitPicker } from "@/app/admin/_components/bookings/unit-picker";
import { useManualBooking, type ManualBookingProps } from "@/app/admin/_components/bookings/use-manual-booking";

/** Phone, Messenger and walk-in bookings. Uses the same availability and price rules as the public form. */
export function ManualBookingForm(props: ManualBookingProps) {
  const { packages, today, walkIn = false } = props;
  const {
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
  } = useManualBooking(props);

  return (
    <details className="admin-edit-card" open={walkIn || undefined}>
      <summary>
        <span>{walkIn ? "Add a walk-in" : "Add a booking by hand"}</span>
        <span>{walkIn ? "Booked and checked in now" : "For phone and Messenger bookings"}</span>
      </summary>
      <form action={createManualBookingAction} className="admin-form admin-editor-form">
        <input type="hidden" name="kind" value={kind} />
        {walkIn && (
          <>
            <input type="hidden" name="status" value="confirmed" />
            <input type="hidden" name="check_in_now" value="on" />
          </>
        )}
        <label>
          What was booked
          <select
            value={kind}
            onChange={(event) => {
              setKind(event.target.value);
              if (event.target.value !== "unit") setEnd("");
            }}
          >
            <option value="unit">Cottage or room</option>
            <option value="entrance">Entrance only</option>
            <option value="exclusive">Whole resort</option>
          </select>
        </label>
        {kind === "exclusive" ? (
          <label>
            Whole-resort package
            <select name="package_id" value={packageId} onChange={(event) => setPackageId(event.target.value)}>
              {packages.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            Visit type
            <select
              name="visit_type"
              value={visitType}
              onChange={(event) => setVisitType(event.target.value === "overnight" ? "overnight" : "day-tour")}
            >
              <option value="day-tour">Day tour</option>
              <option value="overnight">Overnight</option>
            </select>
          </label>
        )}
        <label>
          {multiDay ? "First day" : "Date"}
          <input
            name="date"
            type="date"
            required
            min={today}
            value={start}
            readOnly={walkIn}
            onChange={(event) => {
              setStart(event.target.value);
              if (end && event.target.value > end) setEnd("");
            }}
          />
        </label>
        {multiDay && (
          <label>
            Last day (blank for one day)
            <input
              name="date_end"
              type="date"
              min={start || today}
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </label>
        )}
        {kind === "unit" && (
          <UnitPicker bookable={bookable} taken={taken} chosen={chosen} setSelected={setSelected} start={start} />
        )}
        <label>
          Adults
          <input
            name="adults"
            type="number"
            min={0}
            max={1000}
            value={adults}
            onChange={(event) => setAdults(Number(event.target.value))}
            required
          />
        </label>
        <label>
          Children ages 5–10
          <input
            name="children"
            type="number"
            min={0}
            max={1000}
            value={children}
            onChange={(event) => setChildren(Number(event.target.value))}
            required
          />
        </label>
        <label>
          Guest name
          <input name="guest_name" required maxLength={160} />
        </label>
        <label>
          Phone
          <input name="phone" type="tel" required maxLength={40} />
        </label>
        <CorkageRows
          help="Corkage: item and fee. A new row appears when you fill the last one."
          labelPlaceholder="Item"
          rows={rows}
          onChange={edit}
        />

        <label>
          Total (PHP) — blank uses the automatic total
          <input
            name="total"
            type="number"
            min={0}
            step="0.01"
            placeholder={total === null ? "Set prices first" : String(total)}
          />
        </label>
        {!walkIn && (
          <label>
            Status
            <select name="status" defaultValue="confirmed">
              <option value="confirmed">Confirmed (blocks the date)</option>
              <option value="pending">Pending (does not block)</option>
            </select>
          </label>
        )}
        <label className="admin-field-wide">
          Notes
          <textarea name="notes" rows={2} maxLength={1000} />
        </label>
        <p className="admin-help admin-field-wide">
          Automatic total: <strong>{total === null ? "not available yet" : peso.format(total)}</strong>
          {kind !== "exclusive" && (fees.adult === null || fees.child === null)
            ? " (the entrance fees are missing from Packages and prices)"
            : ""}
        </p>
        <button className="button button-blue admin-field-wide" type="submit" disabled={!canSubmit}>
          {walkIn ? "Save and check in" : "Save booking"}
        </button>
      </form>
    </details>
  );
}
