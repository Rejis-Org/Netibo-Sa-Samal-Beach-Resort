import type { Database } from "@/lib/supabase/database.types";
import { Field } from "./field";
import { UnitPhotoManager } from "./unit-photo-manager";

type Unit = Database["public"]["Tables"]["units"]["Row"];

type Props = {
  /** The unit being edited. Leave out when adding a new one. */
  unit?: Unit;
  /** Storage folder for photos uploaded in this form. */
  photoFolder: string;
  /** Called when the photo list changes (used by the Add dialog to track unsaved edits). */
  onPhotosChange?: () => void;
};

/** The fields shared by the edit card and the Add dialog. */
export function UnitFormFields({ unit, photoFolder, onPhotosChange }: Props) {
  return (
    <>
      <Field label="Name" name="name" defaultValue={unit?.name ?? ""} required />
      <label>
        Type
        <select name="type" defaultValue={unit?.type ?? "room"}>
          <option value="cottage">Cottage</option>
          <option value="room">Room</option>
          <option value="hall">Function hall</option>
          <option value="kubo">Kubo</option>
        </select>
      </label>
      <Field
        label="Price (PHP, whole pesos)"
        name="price"
        type="number"
        min={0}
        defaultValue={unit?.price_amount ?? ""}
      />
      <Field
        label="Minimum guests"
        name="capacity_min"
        type="number"
        min={0}
        defaultValue={unit?.capacity_min ?? ""}
      />
      <Field
        label="Maximum guests"
        name="capacity_max"
        type="number"
        min={0}
        defaultValue={unit?.capacity_max ?? ""}
      />
      <Field
        label="Free entrances included (guests)"
        name="free_entrance_count"
        type="number"
        min={0}
        max={1000}
        defaultValue={unit?.free_entrance_count ?? 0}
      />
      {unit && <Field label="Display order" name="sort_order" type="number" min={0} defaultValue={unit.sort_order} />}
      <Field label="Note about the price" name="price_note" defaultValue={unit?.price_note ?? ""} />
      <label className="admin-checkbox">
        <input name="aircon" type="checkbox" defaultChecked={unit?.aircon ?? false} />
        Air-conditioned
      </label>
      <label className="admin-checkbox">
        <input name="has_own_cr" type="checkbox" defaultChecked={unit?.has_own_cr ?? false} />
        Has own bathroom
      </label>
      <label className="admin-checkbox">
        <input name="active" type="checkbox" defaultChecked={unit?.active ?? true} />
        Show on public site
      </label>
      <UnitPhotoManager folder={photoFolder} initial={unit?.photos ?? []} onChange={onPhotosChange} />
    </>
  );
}
