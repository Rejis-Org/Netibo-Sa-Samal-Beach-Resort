import type { Json } from "@/lib/supabase/database.types";

export function isRecord(value: Json | null): value is { [key: string]: Json | undefined } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: Json | undefined) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export function AdminBookingDetails({ details }: { details: { [key: string]: Json | undefined } }) {
  const rows = [
    ["Reference", stringValue(details.ref_code)],
    ["Guest", stringValue(details.guest_name)],
    ["Booking", stringValue(details.package_name) || stringValue(details.unit_names) || stringValue(details.type)],
    ["Date", [stringValue(details.date_start), stringValue(details.date_end)].filter(Boolean).join(" – ")],
    ["Guests", `${stringValue(details.adults)} adults · ${stringValue(details.children)} children`],
    ["Total", stringValue(details.total_amount)],
    ["Phone", stringValue(details.phone)],
    ["Email", stringValue(details.guest_email)],
    ["Notes", stringValue(details.notes)],
  ].filter(([, value]) => value);
  return (
    <div className="admin-chat-booking">
      <strong>Booking request</strong>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
