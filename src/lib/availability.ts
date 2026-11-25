// Single source of truth for "is this room/cottage free?". Pure functions only (no imports),
// so the booking form, the server actions and the admin screens all use the same rules.
// All dates are plain "YYYY-MM-DD" resort dates. A booking occupies every day from date_start
// through date_end inclusive.

export type BookingKind = "exclusive" | "unit" | "entrance";

export type AvailabilityBooking = {
  id?: string;
  type: BookingKind;
  unit_ids: string[];
  status: string;
  hold_expires_at: string | null;
  date_start: string;
  date_end: string;
};

export type ConflictReason = "closed" | "exclusive" | "booked";
export type Conflict = { date: string; reason: ConflictReason; unitId?: string };

const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 400;

/** Longest stay a guest can request online. Admin can extend beyond this. */
export const MAX_STAY_DAYS = 30;

function toUtcNoon(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day, 12);
}

export function addDays(date: string, days: number) {
  return new Date(toUtcNoon(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Every date from start through end, inclusive. Empty when the range is invalid or longer than 400 days. */
export function eachDay(start: string, end: string): string[] {
  const first = toUtcNoon(start);
  const last = toUtcNoon(end);
  if (!Number.isFinite(first) || !Number.isFinite(last) || last < first || (last - first) / DAY_MS > MAX_RANGE_DAYS) return [];
  const days: string[] = [];
  for (let time = first; time <= last; time += DAY_MS) days.push(new Date(time).toISOString().slice(0, 10));
  return days;
}

export function dayCount(start: string, end: string) {
  return eachDay(start, end).length;
}

/** A booking holds its dates when confirmed, or awaiting payment with an unexpired hold. Pending requests hold nothing. */
export function isLive(booking: Pick<AvailabilityBooking, "status" | "hold_expires_at">, now = new Date()) {
  if (booking.status === "confirmed") return true;
  if (booking.status === "awaiting_payment") return !booking.hold_expires_at || new Date(booking.hold_expires_at) > now;
  return false;
}

function covers(booking: Pick<AvailabilityBooking, "date_start" | "date_end">, day: string) {
  return booking.date_start <= day && booking.date_end >= day;
}

export type ConflictInput = {
  kind: BookingKind;
  start: string;
  end: string;
  unitIds?: string[];
  bookings: AvailabilityBooking[];
  blockedDates: string[];
  /** Skip this booking, for example when editing or extending it. */
  ignoreBookingId?: string;
  now?: Date;
};

/** Every day (and unit) that stops this booking from being made. An empty list means it is free. */
export function findConflicts(input: ConflictInput): Conflict[] {
  const { kind, start, end, unitIds = [], bookings, blockedDates, ignoreBookingId, now = new Date() } = input;
  const blocked = new Set(blockedDates);
  const live = bookings.filter((booking) => booking.id !== ignoreBookingId && isLive(booking, now) && booking.date_end >= start && booking.date_start <= end);
  const conflicts: Conflict[] = [];
  for (const date of eachDay(start, end)) {
    if (blocked.has(date)) { conflicts.push({ date, reason: "closed" }); continue; }
    if (live.some((booking) => booking.type === "exclusive" && covers(booking, date))) { conflicts.push({ date, reason: "exclusive" }); continue; }
    if (kind === "exclusive") {
      if (live.some((booking) => covers(booking, date))) conflicts.push({ date, reason: "booked" });
      continue;
    }
    for (const unitId of unitIds) {
      if (live.some((booking) => booking.unit_ids.includes(unitId) && covers(booking, date))) conflicts.push({ date, reason: "booked", unitId });
    }
  }
  return conflicts;
}

export type UnitAvailabilityRow = { unit_id: string; day: string; state: string };
export type TakenUnit = { reason: ConflictReason; firstDate: string };

/**
 * From get_unit_availability rows: which units cannot be booked for the whole chosen range, and why.
 * Units that are missing from the result are free on every day of the range.
 */
export function unitsTakenInRange(rows: UnitAvailabilityRow[], start: string, end: string) {
  const taken = new Map<string, TakenUnit>();
  for (const row of rows) {
    if (row.day < start || row.day > end) continue;
    if (row.state !== "booked" && row.state !== "exclusive" && row.state !== "closed") continue;
    const current = taken.get(row.unit_id);
    if (!current || row.day < current.firstDate) taken.set(row.unit_id, { reason: row.state, firstDate: row.day });
  }
  return taken;
}

/** Unit ids that are free on one specific day. */
export function freeUnitIdsOn(unitIds: string[], rows: UnitAvailabilityRow[], day: string) {
  const taken = new Set(rows.filter((row) => row.day === day).map((row) => row.unit_id));
  return unitIds.filter((id) => !taken.has(id));
}

export type ExtensionResult = { ok: true; newEnd: string } | { ok: false; conflicts: Conflict[] };

/** Can this booking be stretched by extraDays more days? Only the new days are checked. */
export function checkExtension(input: {
  booking: AvailabilityBooking & { id: string };
  extraDays: number;
  bookings: AvailabilityBooking[];
  blockedDates: string[];
  now?: Date;
}): ExtensionResult {
  const { booking, extraDays, bookings, blockedDates, now } = input;
  if (!Number.isSafeInteger(extraDays) || extraDays < 1) return { ok: false, conflicts: [] };
  const newEnd = addDays(booking.date_end, extraDays);
  const conflicts = findConflicts({
    kind: booking.type,
    start: addDays(booking.date_end, 1),
    end: newEnd,
    unitIds: booking.unit_ids,
    bookings,
    blockedDates,
    ignoreBookingId: booking.id,
    now,
  });
  return conflicts.length ? { ok: false, conflicts } : { ok: true, newEnd };
}

/** How many more days the booking could be extended right now, up to `limit`. Used to enable or disable the Extend button. */
export function maxExtensionDays(input: {
  booking: AvailabilityBooking & { id: string };
  bookings: AvailabilityBooking[];
  blockedDates: string[];
  limit?: number;
  now?: Date;
}) {
  const { limit = 14, ...rest } = input;
  let days = 0;
  while (days < limit && checkExtension({ ...rest, extraDays: days + 1 }).ok) days += 1;
  return days;
}
