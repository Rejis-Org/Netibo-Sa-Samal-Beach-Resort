// Builds the end-of-day report from bookings and logbook entries. Pure (no imports) so the admin report page,
// the CSV export and the "Close day" snapshot all come from the same numbers.
//
// "Sales" are the day's share of each booking's total, not cash received: the system records whether a booking is
// confirmed, not how much was actually paid. A multi-day stay contributes its rooms and entrance evenly per day;
// corkage and whole-resort packages count on the first day.

export type ReportUnit = { id: string; name: string; type: string };

export type ReportBookingRow = {
  id: string;
  ref_code: string;
  guest_name: string;
  status: string;
  type: "exclusive" | "unit" | "entrance";
  package_id: string | null;
  unit_ids: string[];
  date_start: string;
  date_end: string;
  adults: number;
  children: number;
  total_amount: number;
  total_overridden: boolean;
  price_breakdown: unknown;
};

export type ReportLogRow = {
  booking_id: string;
  actual_adults: number;
  actual_children: number;
  checked_in_at: string;
  checked_out_at: string | null;
};

export type ReportRole = "arrival" | "inhouse" | "departure" | "single";

export type DailyReport = {
  date: string;
  generatedAt: string;
  headcount: {
    bookedAdults: number; bookedChildren: number;
    checkedInAdults: number; checkedInChildren: number;
    stillInAdults: number; stillInChildren: number;
  };
  counts: { arrivals: number; inHouse: number; departures: number; unitsBooked: number; unitsTotal: number };
  units: { id: string; name: string; type: string; state: "booked" | "vacant"; guest: string | null; ref: string | null; wholeResort: boolean }[];
  bookings: { ref: string; guest: string; status: string; title: string; role: ReportRole; dateStart: string; dateEnd: string; adults: number; children: number; total: number; share: number }[];
  sales: { rooms: number; entrance: number; corkage: number; packages: number; other: number; total: number };
};

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

function utcDay(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function daysOf(booking: Pick<ReportBookingRow, "date_start" | "date_end">) {
  return Math.max(1, Math.round((utcDay(booking.date_end) - utcDay(booking.date_start)) / 86_400_000) + 1);
}

/** The part of one booking's total that belongs to a single day. */
export function dailyShare(booking: ReportBookingRow, date: string) {
  const days = daysOf(booking);
  const snapshot = record(booking.price_breakdown);
  const consistent = snapshot && !booking.total_overridden && Math.abs(num(snapshot.total) - booking.total_amount) < 0.01;
  const firstDay = date === booking.date_start;
  const share = { rooms: 0, entrance: 0, corkage: 0, packages: 0, other: 0 };
  if (consistent && snapshot.kind === "stay") {
    share.rooms = num(snapshot.unitsSubtotal) / days;
    share.entrance = num(snapshot.entranceNet) / days;
    share.corkage = firstDay ? num(snapshot.corkageSubtotal) : 0;
  } else if (consistent && snapshot.kind === "exclusive") {
    share.packages = firstDay ? num(snapshot.packagePrice) + num(snapshot.extraSubtotal) : 0;
    share.corkage = firstDay ? num(snapshot.corkageSubtotal) : 0;
  } else {
    share.other = booking.total_amount / days;
  }
  return {
    rooms: round(share.rooms), entrance: round(share.entrance), corkage: round(share.corkage),
    packages: round(share.packages), other: round(share.other),
    total: round(share.rooms + share.entrance + share.corkage + share.packages + share.other),
  };
}

export function buildDailyReport(input: {
  date: string;
  /** Start of the day and start of the next day, as ISO timestamps in the resort's time zone. */
  dayStart: string;
  dayEnd: string;
  units: ReportUnit[];
  /** Confirmed, awaiting-payment and completed bookings that touch this date. */
  bookings: ReportBookingRow[];
  logs: ReportLogRow[];
  packageNames: Record<string, string>;
  generatedAt?: string;
}): DailyReport {
  const { date, units, packageNames } = input;
  const dayStart = new Date(input.dayStart).getTime();
  const dayEnd = new Date(input.dayEnd).getTime();
  const covering = input.bookings.filter((booking) => booking.date_start <= date && booking.date_end >= date && booking.status !== "cancelled" && booking.status !== "pending");
  const unitName = new Map(units.map((unit) => [unit.id, unit.name]));

  const wholeResort = covering.find((booking) => booking.type === "exclusive");
  const reportUnits = units.map((unit) => {
    const owner = wholeResort ?? covering.find((booking) => booking.unit_ids.includes(unit.id));
    return { id: unit.id, name: unit.name, type: unit.type, state: owner ? "booked" as const : "vacant" as const, guest: owner?.guest_name ?? null, ref: owner?.ref_code ?? null, wholeResort: Boolean(wholeResort) };
  });

  const sales = { rooms: 0, entrance: 0, corkage: 0, packages: 0, other: 0, total: 0 };
  const rows = covering.map((booking) => {
    const share = dailyShare(booking, date);
    sales.rooms += share.rooms; sales.entrance += share.entrance; sales.corkage += share.corkage; sales.packages += share.packages; sales.other += share.other;
    const role: ReportRole = booking.date_start === booking.date_end ? "single" : booking.date_start === date ? "arrival" : booking.date_end === date ? "departure" : "inhouse";
    const title = booking.type === "exclusive" ? packageNames[booking.package_id ?? ""] ?? "Whole resort" : booking.type === "unit" ? booking.unit_ids.map((id) => unitName.get(id) ?? "Stay").join(", ") : "Entrance only";
    return { ref: booking.ref_code, guest: booking.guest_name, status: booking.status, title, role, dateStart: booking.date_start, dateEnd: booking.date_end, adults: booking.adults, children: booking.children, total: booking.total_amount, share: share.total };
  });
  sales.total = round(sales.rooms + sales.entrance + sales.corkage + sales.packages + sales.other);

  const present = input.logs.filter((log) => new Date(log.checked_in_at).getTime() < dayEnd && (log.checked_out_at === null || new Date(log.checked_out_at).getTime() >= dayStart));
  const stillIn = present.filter((log) => log.checked_out_at === null || new Date(log.checked_out_at).getTime() >= dayEnd);
  const sum = (items: ReportLogRow[], key: "actual_adults" | "actual_children") => items.reduce((total, log) => total + log[key], 0);

  return {
    date,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    headcount: {
      bookedAdults: covering.reduce((total, booking) => total + booking.adults, 0),
      bookedChildren: covering.reduce((total, booking) => total + booking.children, 0),
      checkedInAdults: sum(present, "actual_adults"), checkedInChildren: sum(present, "actual_children"),
      stillInAdults: sum(stillIn, "actual_adults"), stillInChildren: sum(stillIn, "actual_children"),
    },
    counts: {
      arrivals: covering.filter((booking) => booking.date_start === date).length,
      inHouse: covering.length,
      departures: covering.filter((booking) => booking.date_end === date).length,
      unitsBooked: reportUnits.filter((unit) => unit.state === "booked").length,
      unitsTotal: reportUnits.length,
    },
    units: reportUnits,
    bookings: rows,
    sales: { rooms: round(sales.rooms), entrance: round(sales.entrance), corkage: round(sales.corkage), packages: round(sales.packages), other: round(sales.other), total: sales.total },
  };
}

function csvCell(value: string | number) {
  const text = String(value);
  // Quote everything that could break a row, and neutralise spreadsheet formulas typed into guest-provided fields.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function reportToCsv(report: DailyReport) {
  const header = ["Date", "Reference", "Guest", "Status", "Booked", "Role", "From", "To", "Adults", "Children", "Booking total", "Share for the day"];
  const lines = report.bookings.map((row) => [report.date, row.ref, row.guest, row.status, row.title, row.role, row.dateStart, row.dateEnd, row.adults, row.children, row.total, row.share]);
  return [header, ...lines].map((line) => line.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
