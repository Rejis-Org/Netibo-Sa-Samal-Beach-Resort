import type { CorkageItem } from "@/lib/pricing";
import { saveCorkagePresetsAction } from "@/app/admin/_actions/settings";
import { CorkageRows, corkageRows } from "@/app/admin/_components/bookings/corkage-rows";

export function CorkagePresetsEditor({ presets }: { presets: CorkageItem[] }) {
  return (
    <details className="admin-edit-card">
      <summary>
        <span>Corkage presets</span>
        <span>One-tap items on the booking form</span>
      </summary>
      <form action={saveCorkagePresetsAction} className="admin-form admin-editor-form">
        <CorkageRows
          help="Item name and fee. Guests can add these with one tap; they can still type their own. Clear a row to remove it."
          labelPlaceholder="Item, for example Red Horse 6-pack"
          rows={corkageRows(presets)}
        />

        <button className="button button-blue admin-field-wide" type="submit">
          Save corkage presets
        </button>
      </form>
    </details>
  );
}
