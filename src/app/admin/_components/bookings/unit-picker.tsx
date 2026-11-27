import type { unitsTakenInRange } from "@/lib/availability";
import { peso } from "@/app/admin/_lib/format";
import type { ManualBookingProps } from "@/app/admin/_components/bookings/use-manual-booking";

type UnitPickerProps = {
  bookable: ManualBookingProps["units"];
  taken: ReturnType<typeof unitsTakenInRange>;
  chosen: string[];
  setSelected: (ids: string[]) => void;
  start: string;
};

export function UnitPicker({ bookable, taken, chosen, setSelected, start }: UnitPickerProps) {
  return (
    <fieldset className="admin-field-wide admin-unit-picker">
      <legend>Cottages and rooms</legend>
      {bookable.map((unit) => {
        const blocked = taken.get(unit.id);
        return (
          <label key={unit.id} className={`admin-checkbox${blocked ? " admin-unit-taken" : ""}`}>
            <input
              type="checkbox"
              name="unit_id"
              value={unit.id}
              checked={chosen.includes(unit.id)}
              disabled={Boolean(blocked)}
              onChange={() =>
                setSelected(chosen.includes(unit.id) ? chosen.filter((id) => id !== unit.id) : [...chosen, unit.id])
              }
            />
            {unit.name} · {peso.format(unit.price ?? 0)}
            {blocked ? ` · not available from ${blocked.firstDate}` : ""}
          </label>
        );
      })}
      {!start && <p className="admin-help">Pick the dates first to see which places are free.</p>}
    </fieldset>
  );
}
