import type { Database, Json } from "@/lib/supabase/database.types";
import { findSection, type AdminSectionId } from "./admin-sections";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

export const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
export const formatDate = (value: string) => new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(new Date(`${value}T12:00:00+08:00`));

export const errorMessages: Record<string, string> = {
  unit: "Please check the unit fields and try saving again.",
  package: "Please check the package fields and try saving again.",
  settings: "Please check the setting value and try saving again.",
  access: "Only the owner account can change resort settings.",
  booking: "That booking could not be updated. Refresh the list and try again.",
  deadline: "Set a payment deadline in Resort settings before approving a request.",
  conflict: "Those dates were just taken by another approved booking. The request remains pending.",
  manual: "That booking could not be saved. Check the details; the date or place may already be taken.",
  blocked: "That closed date could not be saved or removed. Check it and try again.",
  blockedExists: "That date is already closed.",
  blockedConflict: "That date already has an approved or confirmed booking. Cancel that booking first.",
};

export type Flash = { error?: string; saved?: string; receipt?: string };

// Shows "cancelled" for approved bookings whose payment deadline has passed, without waiting on the database clean-up.
export function withLiveStatus(rows: BookingRow[]): BookingRow[] {
  const now = Date.now();
  return rows.map((row) => row.status === "awaiting_payment" && row.hold_expires_at && new Date(row.hold_expires_at).getTime() <= now ? { ...row, status: "cancelled" as const } : row);
}

function packageName(value: Json, fallback: string) {
  return value && typeof value === "object" && !Array.isArray(value) && typeof value.en === "string" ? value.en : fallback;
}

export function makeBookingTitle(packages: { id: string; slug: string; name: Json }[], units: { id: string; name: string }[]) {
  const packageNames = new Map(packages.map((item) => [item.id, packageName(item.name, item.slug)]));
  const unitNames = new Map(units.map((item) => [item.id, item.name]));
  return (booking: BookingRow) =>
    booking.type === "exclusive" ? packageNames.get(booking.package_id ?? "") ?? "Exclusive package" : booking.type === "unit" ? booking.unit_ids.map((id) => unitNames.get(id) ?? "Stay").join(", ") : "Entrance";
}

type FrameProps = { section: AdminSectionId; flash?: Flash; loadFailed?: boolean; children: React.ReactNode };

export function AdminPageFrame({ section, flash, loadFailed, children }: FrameProps) {
  const meta = findSection(section);
  const today = new Intl.DateTimeFormat("en-PH", { dateStyle: "full", timeZone: "Asia/Manila" }).format(new Date());
  const receiptId = flash?.receipt && /^[0-9a-f-]{36}$/i.test(flash.receipt) ? flash.receipt : null;
  return (
    <>
      <header className="admin-page-header">
        <div><p className="eyebrow">{meta?.eyebrow}</p><h1>{meta?.label}</h1></div>
        <div className="admin-page-header-side"><span>{today}</span><p>{meta?.description}</p></div>
      </header>
      <div className="admin-content">
        {flash?.saved && (
          <p className="admin-message admin-message-success">
            {flash.saved === "manual" ? "Booking saved. The date is now on the calendar." : "Changes saved. The public pages now show the latest catalog."}
            {receiptId && <> <a className="admin-message-link" href={`/admin/receipt/${receiptId}`} target="_blank" rel="noopener noreferrer">Open the receipt</a></>}
          </p>
        )}
        {flash?.error && <p className="admin-message admin-message-error">{errorMessages[flash.error] ?? "Something went wrong. Try again or check the database connection."}</p>}
        {loadFailed && <p className="admin-message admin-message-error">Could not load resort data. Confirm that `supabase/schema.sql` has been run in this project.</p>}
        {children}
      </div>
    </>
  );
}
