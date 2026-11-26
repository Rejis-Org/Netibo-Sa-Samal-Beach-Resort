// Single source of truth for booking totals. Pure functions only (no imports), so the booking form
// (live total), the server action (the real total) and the admin edit form can never disagree.
//
// Stay total = rooms/cottages (price x days)
//            + entrance for every adult and child (fee x days)
//            - free entrances included with the chosen rooms (adults are credited first)
//            + corkage items
// Whole-resort packages: package price + extra guests beyond the included pax + corkage items.

export type VisitType = "day-tour" | "overnight";
export type CorkageItem = { label: string; amount: number };

export const MAX_CORKAGE_ROWS = 30;
const MAX_CORKAGE_LABEL = 80;

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const isCount = (value: number) => Number.isSafeInteger(value) && value >= 0;
const isMoney = (value: number) => Number.isFinite(value) && value >= 0;

/**
 * Turns the form's repeated corkage fields (label[] and amount[]) into clean items.
 * Fully empty rows are skipped; a half-filled or negative row marks the whole list invalid.
 */
export function parseCorkageRows(labels: string[], amounts: string[]) {
  const rowCount = Math.max(labels.length, amounts.length);
  const items: CorkageItem[] = [];
  let invalid = rowCount > MAX_CORKAGE_ROWS * 2;
  for (let index = 0; index < Math.min(rowCount, MAX_CORKAGE_ROWS * 2); index += 1) {
    const label = (labels[index] ?? "").trim();
    const raw = (amounts[index] ?? "").trim();
    if (!label && !raw) continue;
    const amount = raw === "" ? Number.NaN : Number(raw.replace(/,/g, ""));
    if (!label || label.length > MAX_CORKAGE_LABEL || !isMoney(amount)) { invalid = true; continue; }
    items.push({ label, amount: roundMoney(amount) });
  }
  if (items.length > MAX_CORKAGE_ROWS) invalid = true;
  return { items: items.slice(0, MAX_CORKAGE_ROWS), invalid };
}

/** Reads corkage items back from a jsonb column or setting, ignoring anything malformed. */
export function normalizeCorkageItems(value: unknown): CorkageItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { label, amount } = entry as { label?: unknown; amount?: unknown };
    if (typeof label !== "string" || !label.trim() || typeof amount !== "number" || !isMoney(amount)) return [];
    return [{ label: label.trim().slice(0, MAX_CORKAGE_LABEL), amount: roundMoney(amount) }];
  });
}

export type StayPriceInput = {
  /** Number of occupied days (a one-day visit is 1). */
  days: number;
  adults: number;
  children: number;
  units: { id: string; name: string; price: number; freeEntrances: number }[];
  adultFee: number;
  childFee: number;
  corkage: CorkageItem[];
};

export type StayPriceBreakdown = {
  version: 1;
  kind: "stay";
  days: number;
  unitLines: { unitId: string; name: string; pricePerDay: number; days: number; subtotal: number; freeEntrances: number }[];
  unitsSubtotal: number;
  adults: number;
  children: number;
  adultFee: number;
  childFee: number;
  /** Entrance for every guest, before free entrances. */
  entranceGross: number;
  /** Free entrances per day, added up across the chosen units. */
  freeEntrancesPerDay: number;
  freeAdults: number;
  freeChildren: number;
  /** Value of the free entrances over all days. */
  freeCredit: number;
  entranceNet: number;
  corkageItems: CorkageItem[];
  corkageSubtotal: number;
  total: number;
};

export type PriceResult<T> = { ok: true; breakdown: T } | { ok: false; reason: "invalid" | "extraFee" };

export function priceStay(input: StayPriceInput): PriceResult<StayPriceBreakdown> {
  const { days, adults, children, units, adultFee, childFee, corkage } = input;
  if (!isCount(days) || days < 1 || !isCount(adults) || !isCount(children) || !isMoney(adultFee) || !isMoney(childFee)) return { ok: false, reason: "invalid" };
  if (units.some((unit) => !isMoney(unit.price) || !isCount(unit.freeEntrances)) || corkage.some((item) => !isMoney(item.amount))) return { ok: false, reason: "invalid" };

  const unitLines = units.map((unit) => ({
    unitId: unit.id,
    name: unit.name,
    pricePerDay: unit.price,
    days,
    subtotal: roundMoney(unit.price * days),
    freeEntrances: unit.freeEntrances,
  }));
  const unitsSubtotal = roundMoney(unitLines.reduce((sum, line) => sum + line.subtotal, 0));

  const freeEntrancesPerDay = units.reduce((sum, unit) => sum + unit.freeEntrances, 0);
  const freeAdults = Math.min(adults, freeEntrancesPerDay);
  const freeChildren = Math.min(children, freeEntrancesPerDay - freeAdults);
  const entranceGross = roundMoney((adults * adultFee + children * childFee) * days);
  const freeCredit = roundMoney((freeAdults * adultFee + freeChildren * childFee) * days);
  const entranceNet = roundMoney(entranceGross - freeCredit);

  const corkageSubtotal = roundMoney(corkage.reduce((sum, item) => sum + item.amount, 0));
  return {
    ok: true,
    breakdown: {
      version: 1,
      kind: "stay",
      days,
      unitLines,
      unitsSubtotal,
      adults,
      children,
      adultFee,
      childFee,
      entranceGross,
      freeEntrancesPerDay,
      freeAdults,
      freeChildren,
      freeCredit,
      entranceNet,
      corkageItems: corkage,
      corkageSubtotal,
      total: roundMoney(unitsSubtotal + entranceNet + corkageSubtotal),
    },
  };
}

export type ExclusivePriceInput = {
  packagePrice: number;
  paxIncluded: number | null;
  extraGuestFee: number | null;
  guests: number;
  corkage: CorkageItem[];
};

export type ExclusivePriceBreakdown = {
  version: 1;
  kind: "exclusive";
  packagePrice: number;
  paxIncluded: number | null;
  guests: number;
  extraGuests: number;
  extraGuestFee: number | null;
  extraSubtotal: number;
  corkageItems: CorkageItem[];
  corkageSubtotal: number;
  total: number;
};

export function priceExclusive(input: ExclusivePriceInput): PriceResult<ExclusivePriceBreakdown> {
  const { packagePrice, paxIncluded, extraGuestFee, guests, corkage } = input;
  if (!isMoney(packagePrice) || !isCount(guests) || guests < 1 || corkage.some((item) => !isMoney(item.amount))) return { ok: false, reason: "invalid" };
  const extraGuests = paxIncluded !== null && guests > paxIncluded ? guests - paxIncluded : 0;
  if (extraGuests > 0 && (extraGuestFee === null || !isMoney(extraGuestFee))) return { ok: false, reason: "extraFee" };
  const extraSubtotal = roundMoney(extraGuests * (extraGuestFee ?? 0));
  const corkageSubtotal = roundMoney(corkage.reduce((sum, item) => sum + item.amount, 0));
  return {
    ok: true,
    breakdown: {
      version: 1,
      kind: "exclusive",
      packagePrice,
      paxIncluded,
      guests,
      extraGuests,
      extraGuestFee,
      extraSubtotal,
      corkageItems: corkage,
      corkageSubtotal,
      total: roundMoney(packagePrice + extraSubtotal + corkageSubtotal),
    },
  };
}

export type PriceBreakdown = StayPriceBreakdown | ExclusivePriceBreakdown;

/** Admin may type a total by hand. Blank means "use the computed one". */
export function resolveTotal(computed: number, manual: number | null) {
  if (manual === null || !isMoney(manual)) return { total: computed, overridden: false };
  const total = roundMoney(manual);
  return { total, overridden: total !== computed };
}
