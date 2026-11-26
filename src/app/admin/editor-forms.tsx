import type { Database, Json } from "@/lib/supabase/database.types";
import { normalizeCorkageItems, type CorkageItem } from "@/lib/pricing";
import { addBlockedDateAction, editBookingAction, extendBookingAction, removeBlockedDateAction, saveCorkagePresetsAction, savePackageAction, saveSettingAction, saveUnitAction } from "./actions";

type Unit = Database["public"]["Tables"]["units"]["Row"];
type Package = Database["public"]["Tables"]["packages"]["Row"];
type Setting = Database["public"]["Tables"]["settings"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

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
        <Field label="Free entrances included (guests)" name="free_entrance_count" type="number" min={0} max={1000} defaultValue={unit.free_entrance_count} />
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

const pesoAmount = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2, minimumFractionDigits: 0 });

function corkageRows(items: CorkageItem[]) {
  return [...items.map((item) => ({ label: item.label, amount: String(item.amount) })), ...Array.from({ length: 3 }, () => ({ label: "", amount: "" }))];
}

/** One line explaining how a booking's total was built, read from its saved price snapshot. */
export function breakdownSummary(value: Json | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data: Record<string, Json | undefined> = value;
  const num = (key: string) => { const entry = data[key]; return typeof entry === "number" ? entry : null; };
  const money = (key: string) => { const entry = num(key); return entry === null ? null : pesoAmount.format(entry); };
  const parts: string[] = [];
  if (data.kind === "stay") {
    const rooms = num("unitsSubtotal");
    const days = num("days");
    if (rooms !== null && rooms > 0) parts.push(`Rooms ${money("unitsSubtotal")}${days !== null && days > 1 ? ` (${days} days)` : ""}`);
    if (money("entranceGross")) parts.push(`Entrance ${money("entranceGross")}`);
    const credit = num("freeCredit");
    if (credit !== null && credit > 0) parts.push(`free entrance −${money("freeCredit")}`);
  } else if (data.kind === "exclusive") {
    if (money("packagePrice")) parts.push(`Package ${money("packagePrice")}`);
    const extra = num("extraSubtotal");
    if (extra !== null && extra > 0) parts.push(`extra guests ${money("extraSubtotal")}`);
  } else return null;
  const corkageTotal = num("corkageSubtotal");
  if (corkageTotal !== null && corkageTotal > 0) parts.push(`corkage ${money("corkageSubtotal")}`);
  return parts.join(" · ");
}

export function CorkagePresetsEditor({ presets }: { presets: CorkageItem[] }) {
  return (
    <details className="admin-edit-card">
      <summary><span>Corkage presets</span><span>One-tap items on the booking form</span></summary>
      <form action={saveCorkagePresetsAction} className="admin-form admin-editor-form">
        <div className="admin-field-wide admin-corkage-rows">
          <p className="admin-help">Item name and fee. Guests can add these with one tap; they can still type their own. Clear a row to remove it.</p>
          {corkageRows(presets).map((row, index) => <div className="admin-corkage-row" key={index}>
            <input name="corkage_label" maxLength={80} placeholder="Item, for example Red Horse 6-pack" defaultValue={row.label} />
            <input name="corkage_amount" type="number" min={0} step="any" placeholder="Fee (PHP)" defaultValue={row.amount} />
          </div>)}
        </div>
        <button className="button button-blue admin-field-wide" type="submit">Save corkage presets</button>
      </form>
    </details>
  );
}

export function EditBookingForm({ booking }: { booking: Booking }) {
  return (
    <details className="admin-edit-card admin-booking-edit">
      <summary><span>Edit details and price</span><span>{booking.total_overridden ? "Total set by hand" : "Total from price list"}</span></summary>
      <form action={editBookingAction} className="admin-form admin-editor-form">
        <input type="hidden" name="booking_id" value={booking.id} />
        <label>Guest name<input name="guest_name" required maxLength={160} defaultValue={booking.guest_name} /></label>
        <label>Phone<input name="phone" type="tel" required maxLength={40} defaultValue={booking.phone} /></label>
        <label>Adults<input name="adults" type="number" min={0} max={1000} required defaultValue={booking.adults} /></label>
        <label>Children ages 5–10<input name="children" type="number" min={0} max={1000} required defaultValue={booking.children} /></label>
        <div className="admin-field-wide admin-corkage-rows">
          <p className="admin-help">Corkage items and fees. Leave a row blank to skip it.</p>
          {corkageRows(normalizeCorkageItems(booking.corkage_items)).map((row, index) => <div className="admin-corkage-row" key={index}>
            <input name="corkage_label" maxLength={80} placeholder="Item" defaultValue={row.label} />
            <input name="corkage_amount" type="number" min={0} step="any" placeholder="Fee (PHP)" defaultValue={row.amount} />
          </div>)}
        </div>
        <label>Total (PHP)<input name="total" type="number" min={0} step="0.01" defaultValue={booking.total_amount} /></label>
        <label className="admin-checkbox"><input name="recalc" type="checkbox" />Recalculate the total from today&apos;s prices (ignores the total typed here)</label>
        <label className="admin-field-wide">Notes<textarea name="notes" rows={2} maxLength={1000} defaultValue={booking.notes ?? ""} /></label>
        <button className="button button-blue admin-field-wide" type="submit">Save changes</button>
      </form>
    </details>
  );
}

export function ExtendBookingForm({ booking, maxDays }: { booking: Booking; maxDays: number }) {
  if (maxDays < 1) return <p className="admin-help admin-booking-extend">Cannot extend: the next day is already booked or closed.</p>;
  return (
    <form className="admin-booking-extend" action={extendBookingAction}>
      <input type="hidden" name="booking_id" value={booking.id} />
      <label>Extend by <input name="extra_days" type="number" min={1} max={maxDays} defaultValue={1} required /> day(s)</label>
      <button className="button button-blue" type="submit">Extend stay</button>
      <span className="admin-help">Up to {maxDays} more day{maxDays === 1 ? "" : "s"} free.</span>
    </form>
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
