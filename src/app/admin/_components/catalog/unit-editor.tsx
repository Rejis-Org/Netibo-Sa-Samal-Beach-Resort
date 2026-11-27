import type { Database } from "@/lib/supabase/database.types";
import { saveUnitAction } from "@/app/admin/_actions/catalog";
import { Field } from "./field";

type Unit = Database["public"]["Tables"]["units"]["Row"];

export function UnitEditor({ unit }: { unit: Unit }) {
  return (
    <details className="admin-edit-card">
      <summary>
        <span>{unit.name}</span>
        <span>{unit.active ? "Visible on site" : "Hidden"}</span>
      </summary>
      <form action={saveUnitAction} className="admin-form admin-editor-form">
        <input type="hidden" name="id" value={unit.id} />
        <Field label="Name" name="name" defaultValue={unit.name} />
        <label>
          Type
          <select name="type" defaultValue={unit.type}>
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
          defaultValue={unit.price_amount ?? ""}
        />
        <Field
          label="Minimum guests"
          name="capacity_min"
          type="number"
          min={0}
          defaultValue={unit.capacity_min ?? ""}
        />
        <Field
          label="Maximum guests"
          name="capacity_max"
          type="number"
          min={0}
          defaultValue={unit.capacity_max ?? ""}
        />
        <Field
          label="Free entrances included (guests)"
          name="free_entrance_count"
          type="number"
          min={0}
          max={1000}
          defaultValue={unit.free_entrance_count}
        />
        <Field label="Display order" name="sort_order" type="number" min={0} defaultValue={unit.sort_order} />
        <Field label="Note about the price" name="price_note" defaultValue={unit.price_note ?? ""} />
        <label className="admin-checkbox">
          <input name="aircon" type="checkbox" defaultChecked={unit.aircon} />
          Air-conditioned
        </label>
        <label className="admin-checkbox">
          <input name="has_own_cr" type="checkbox" defaultChecked={unit.has_own_cr} />
          Has own bathroom
        </label>
        <label className="admin-checkbox">
          <input name="active" type="checkbox" defaultChecked={unit.active} />
          Show on public site
        </label>
        <label className="admin-field-wide">
          Photo URLs, one per line
          <textarea name="photos" rows={3} defaultValue={unit.photos.join("\n")} />
        </label>
        <button className="button button-blue admin-field-wide" type="submit">
          Save {unit.name}
        </button>
      </form>
    </details>
  );
}
