import type { Database, Json } from "@/lib/supabase/database.types";
import { savePackageAction } from "@/app/admin/_actions/catalog";
import { Field } from "./field";

type Package = Database["public"]["Tables"]["packages"]["Row"];

function localized(value: Json, key: string) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const field = value[key];
    return typeof field === "string" ? field : "";
  }
  return "";
}

export function PackageEditor({ item }: { item: Package }) {
  return (
    <details className="admin-edit-card">
      <summary>
        <span>{localized(item.name, "en") || item.slug}</span>
        <span>{item.active ? "Visible on site" : "Hidden"}</span>
      </summary>
      <form action={savePackageAction} className="admin-form admin-editor-form">
        <input type="hidden" name="id" value={item.id} />
        <label>
          English name
          <input name="name_en" required maxLength={120} defaultValue={localized(item.name, "en")} />
        </label>
        <label>
          Tagalog name
          <input name="name_fil" required maxLength={120} defaultValue={localized(item.name, "fil")} />
        </label>
        <label>
          Cebuano name
          <input name="name_ceb" required maxLength={120} defaultValue={localized(item.name, "ceb")} />
        </label>
        <label>
          Package type
          <select name="scope" defaultValue={item.scope}>
            <option value="exclusive">Whole resort</option>
            <option value="walk-in">Walk-in</option>
          </select>
        </label>
        <Field
          label="Price (PHP, whole pesos)"
          name="price"
          type="number"
          min={0}
          defaultValue={item.price_amount ?? ""}
        />
        <Field
          label="Guests included"
          name="pax_included"
          type="number"
          min={0}
          defaultValue={item.pax_included ?? ""}
        />
        <Field label="Display order" name="sort_order" type="number" min={0} defaultValue={item.sort_order} />
        <label className="admin-checkbox">
          <input name="weekday_only" type="checkbox" defaultChecked={item.weekday_only} />
          Weekdays only
        </label>
        <label className="admin-checkbox">
          <input name="weekend_only" type="checkbox" defaultChecked={item.weekend_only} />
          Weekends only
        </label>
        <label className="admin-checkbox">
          <input name="active" type="checkbox" defaultChecked={item.active} />
          Show on public site
        </label>
        <label>
          English note
          <textarea name="notes_en" rows={2} defaultValue={localized(item.notes, "en")} />
        </label>
        <label>
          Tagalog note
          <textarea name="notes_fil" rows={2} defaultValue={localized(item.notes, "fil")} />
        </label>
        <label>
          Cebuano note
          <textarea name="notes_ceb" rows={2} defaultValue={localized(item.notes, "ceb")} />
        </label>
        <button className="button button-blue admin-field-wide" type="submit">
          Save {localized(item.name, "en") || item.slug}
        </button>
      </form>
    </details>
  );
}
