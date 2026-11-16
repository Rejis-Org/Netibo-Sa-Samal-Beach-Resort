import type { Database, Json } from "@/lib/supabase/database.types";
import { addBlockedDateAction, createManualBookingAction, removeBlockedDateAction, savePackageAction, saveSettingAction, saveUnitAction } from "./actions";

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

type BlockedDate = Database["public"]["Tables"]["blocked_dates"]["Row"];

export function ManualBookingForm({ packages, units }: { packages: Package[]; units: Unit[] }) {
  const exclusivePackages = packages.filter((item) => item.scope === "exclusive" && item.active);
  return (
    <details className="admin-edit-card">
      <summary><span>Add a booking by hand</span><span>For phone and Messenger bookings</span></summary>
      <form action={createManualBookingAction} className="admin-form admin-editor-form">
        <label>What was booked<select name="kind" defaultValue="unit"><option value="unit">Cottage or room</option><option value="exclusive">Whole resort</option><option value="entrance">Entrance only</option></select></label>
        <label>Whole-resort package<select name="package_id" defaultValue=""><option value="">Not a whole-resort booking</option>{exclusivePackages.map((item) => <option key={item.id} value={item.id}>{localized(item.name, "en") || item.slug}</option>)}</select></label>
        <label>Cottage or room<select name="unit_id" defaultValue=""><option value="">Not a cottage or room booking</option>{units.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Date<input name="date" type="date" required /></label>
        <label>Adults<input name="adults" type="number" min={0} max={1000} defaultValue={1} required /></label>
        <label>Children ages 5–10<input name="children" type="number" min={0} max={1000} defaultValue={0} required /></label>
        <label>Guest name<input name="guest_name" required maxLength={160} /></label>
        <label>Phone<input name="phone" type="tel" required maxLength={40} /></label>
        <label>Total (PHP, whole pesos)<input name="total" type="number" min={0} required /></label>
        <label>Status<select name="status" defaultValue="confirmed"><option value="confirmed">Confirmed (blocks the date)</option><option value="pending">Pending (does not block)</option></select></label>
        <label className="admin-field-wide">Notes<textarea name="notes" rows={2} maxLength={1000} /></label>
        <button className="button button-blue admin-field-wide" type="submit">Save booking</button>
      </form>
    </details>
  );
}

export function BlockedDatesPanel({ dates }: { dates: BlockedDate[] }) {
  return (
    <div className="admin-booking-list">
      <form action={addBlockedDateAction} className="admin-form admin-editor-form">
        <label>Date to close<input name="date" type="date" required /></label>
        <label>Reason (optional)<input name="reason" maxLength={120} placeholder="For example, maintenance" /></label>
        <button className="button button-blue admin-field-wide" type="submit">Close this date</button>
      </form>
      {dates.length === 0 && <p className="admin-empty-state">No closed dates.</p>}
      {dates.map((item) => (
        <article className="admin-booking-card" key={item.id}>
          <div className="admin-booking-heading">
            <div>
              <h3>{new Intl.DateTimeFormat("en-PH", { dateStyle: "full", timeZone: "Asia/Manila" }).format(new Date(`${item.date}T12:00:00+08:00`))}</h3>
              <p>{item.reason}</p>
            </div>
            <form action={removeBlockedDateAction}><input type="hidden" name="id" value={item.id} /><button className="button button-outline" type="submit">Reopen</button></form>
          </div>
        </article>
      ))}
    </div>
  );
}
