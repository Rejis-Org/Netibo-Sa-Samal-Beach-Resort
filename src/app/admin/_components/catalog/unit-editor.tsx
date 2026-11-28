import type { Database } from "@/lib/supabase/database.types";
import { saveUnitAction } from "@/app/admin/_actions/catalog";
import { UnitFormFields } from "./unit-form-fields";

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
        <UnitFormFields unit={unit} photoFolder={unit.id} />
        <button className="button button-blue admin-field-wide" type="submit">
          Save {unit.name}
        </button>
      </form>
    </details>
  );
}
