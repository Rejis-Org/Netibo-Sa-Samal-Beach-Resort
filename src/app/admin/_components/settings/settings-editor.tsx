import type { Database, Json } from "@/lib/supabase/database.types";
import { saveSettingAction } from "@/app/admin/_actions/settings";

type Setting = Database["public"]["Tables"]["settings"]["Row"];

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
          <label>
            {definition.label}
            <input
              name="value"
              type={definition.type}
              defaultValue={settingDisplay(values.get(key) ?? null)}
              disabled={!owner}
            />
          </label>
          {owner && (
            <button className="button button-blue button-small" type="submit">
              Save
            </button>
          )}
        </form>
      ))}
      {!owner && <p className="admin-help admin-field-wide">Only the owner account can change resort settings.</p>}
    </div>
  );
}
