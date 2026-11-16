import type { Database, Json } from "@/lib/supabase/database.types";
import { savePackageAction, saveSettingAction, saveUnitAction } from "./actions";

type Unit = Database["public"]["Tables"]["units"]["Row"];
type Package = Database["public"]["Tables"]["packages"]["Row"];
type Setting = Database["public"]["Tables"]["settings"]["Row"];

function localized(value: Json, key: string) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const field = value[key];
    return typeof field === "string" ? field : "";
  }
  return "";
}

function Field({ label, name, defaultValue, type = "text", min, max }: {
  label: string; name: string; defaultValue: string | number; type?: string; min?: number; max?: number;
}) {
  return <label>{label}<input name={name} type={type} defaultValue={defaultValue} min={min} max={max} /></label>;
}

export function UnitEditor({ unit }: { unit: Unit }) {
  return (
    <details className="admin-edit-card">
      <summary><span>{unit.name}</span><span>{unit.active ? "Visible on site" : "Hidden"}</span></summary>
      <form action={saveUnitAction} className="admin-form admin-editor-form">
        <input type="hidden" name="id" value={unit.id} />
        <Field label="Name" name="name" defaultValue={unit.name} />
        <label>Type<select name="type" defaultValue={unit.type}><option value="cottage">Cottage</option><option value="room">Room</option><option value="hall">Function hall</option><option value="kubo">Kubo</option></select></label>
        <Field label="Price (PHP, whole pesos)" name="price" type="number" min={0} defaultValue={unit.price_amount ?? ""} />
        <Field label="Minimum guests" name="capacity_min" type="number" min={0} defaultValue={unit.capacity_min ?? ""} />
        <Field label="Maximum guests" name="capacity_max" type="number" min={0} defaultValue={unit.capacity_max ?? ""} />
        <Field label="Display order" name="sort_order" type="number" min={0} defaultValue={unit.sort_order} />
        <Field label="Note about the price" name="price_note" defaultValue={unit.price_note ?? ""} />
        <label className="admin-checkbox"><input name="aircon" type="checkbox" defaultChecked={unit.aircon} />Air-conditioned</label>
        <label className="admin-checkbox"><input name="has_own_cr" type="checkbox" defaultChecked={unit.has_own_cr} />Has own bathroom</label>
        <label className="admin-checkbox"><input name="active" type="checkbox" defaultChecked={unit.active} />Show on public site</label>
        <label className="admin-field-wide">Photo URLs, one per line<textarea name="photos" rows={3} defaultValue={unit.photos.join("\n")} /></label>
        <button className="button button-blue admin-field-wide" type="submit">Save {unit.name}</button>
      </form>
    </details>
  );
}

export function PackageEditor({ item }: { item: Package }) {
  return (
    <details className="admin-edit-card">
      <summary><span>{localized(item.name, "en") || item.slug}</span><span>{item.active ? "Visible on site" : "Hidden"}</span></summary>
      <form action={savePackageAction} className="admin-form admin-editor-form">
        <input type="hidden" name="id" value={item.id} />
        <label>English name<input name="name_en" required maxLength={120} defaultValue={localized(item.name, "en")} /></label>
        <label>Tagalog name<input name="name_fil" required maxLength={120} defaultValue={localized(item.name, "fil")} /></label>
        <label>Cebuano name<input name="name_ceb" required maxLength={120} defaultValue={localized(item.name, "ceb")} /></label>
        <label>Package type<select name="scope" defaultValue={item.scope}><option value="exclusive">Whole resort</option><option value="walk-in">Walk-in</option></select></label>
        <Field label="Price (PHP, whole pesos)" name="price" type="number" min={0} defaultValue={item.price_amount ?? ""} />
        <Field label="Guests included" name="pax_included" type="number" min={0} defaultValue={item.pax_included ?? ""} />
        <Field label="Display order" name="sort_order" type="number" min={0} defaultValue={item.sort_order} />
        <label className="admin-checkbox"><input name="weekday_only" type="checkbox" defaultChecked={item.weekday_only} />Weekdays only</label>
        <label className="admin-checkbox"><input name="weekend_only" type="checkbox" defaultChecked={item.weekend_only} />Weekends only</label>
        <label className="admin-checkbox"><input name="active" type="checkbox" defaultChecked={item.active} />Show on public site</label>
        <label>English note<textarea name="notes_en" rows={2} defaultValue={localized(item.notes, "en")} /></label>
        <label>Tagalog note<textarea name="notes_fil" rows={2} defaultValue={localized(item.notes, "fil")} /></label>
        <label>Cebuano note<textarea name="notes_ceb" rows={2} defaultValue={localized(item.notes, "ceb")} /></label>
        <button className="button button-blue admin-field-wide" type="submit">Save {localized(item.name, "en") || item.slug}</button>
      </form>
    </details>
  );
}

const settingsLabels: Record<string, { label: string; type: string }> = {
  contact_phone: { label: "Resort phone", type: "tel" },
  gcash_number: { label: "GCash number", type: "tel" },
  gcash_account_name: { label: "GCash account name", type: "text" },
  deposit_amount: { label: "Deposit amount (PHP)", type: "number" },
  deposit_percent: { label: "Deposit percentage", type: "number" },
  payment_deadline_hours: { label: "Payment deadline (hours)", type: "number" },
  extra_guest_fee: { label: "Extra guest fee (PHP)", type: "number" },
  reply_time_hours: { label: "Usual reply time (hours)", type: "number" },
  day_tour_start: { label: "Day tour starts at", type: "time" },
  overnight_start: { label: "Overnight starts at", type: "time" },
  cancellation_refund_policy: { label: "Cancellation and refund policy", type: "text" },
  arrival_directions: { label: "Directions from the port", type: "text" },
};

function settingDisplay(value: Json) {
  if (value === null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

export function SettingsEditor({ settings, owner }: { settings: Setting[]; owner: boolean }) {
  const values = new Map(settings.map((setting) => [setting.key, setting.value]));
  return (
    <div className="admin-settings-grid">
      {Object.entries(settingsLabels).map(([key, definition]) => (
        <form key={key} action={saveSettingAction} className="admin-setting-card">
          <input type="hidden" name="key" value={key} />
          <label>{definition.label}<input name="value" type={definition.type} defaultValue={settingDisplay(values.get(key) ?? null)} disabled={!owner} /></label>
          {owner && <button className="button button-blue button-small" type="submit">Save</button>}
        </form>
      ))}
      {!owner && <p className="admin-help admin-field-wide">Only the owner account can change resort settings.</p>}
    </div>
  );
}
