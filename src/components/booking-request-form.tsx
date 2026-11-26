"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import type { AvailabilityDay, BookingOptions } from "@/lib/booking-data";
import type { AppLocale } from "@/i18n/routing";
import { submitBookingRequest } from "@/app/[locale]/book/actions";
import { MAX_STAY_DAYS, addDays, dayCount, unitsTakenInRange, type UnitAvailabilityRow } from "@/lib/availability";
import { MAX_CORKAGE_ROWS, parseCorkageRows, priceExclusive, priceStay, type CorkageItem } from "@/lib/pricing";

type Props = {
  locale: AppLocale;
  options: NonNullable<BookingOptions>;
  days: AvailabilityDay[];
  unitRows: UnitAvailabilityRow[];
  minDate: string;
  maxDate: string;
  error?: string;
  initialDate?: string;
};

type CorkageRow = { key: number; label: string; amount: string };

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2, minimumFractionDigits: 0 });
const blankRow = (key: number): CorkageRow => ({ key, label: "", amount: "" });

export function BookingRequestForm({ locale, options, days, unitRows, minDate, maxDate, error, initialDate }: Props) {
  const t = useTranslations("pages.bookingFlow");
  const [kind, setKind] = useState("exclusive");
  const [packageId, setPackageId] = useState(options.packages.find((item) => item.scope === "exclusive")?.id ?? "");
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [visitType, setVisitType] = useState<"day-tour" | "overnight">("day-tour");
  // start is the first day. end stays empty until a stay's last day is tapped; empty means a one-day stay.
  const [start, setStart] = useState(initialDate ?? "");
  const [end, setEnd] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [corkageRows, setCorkageRows] = useState<CorkageRow[]>([blankRow(1)]);
  const [nextRowKey, setNextRowKey] = useState(2);

  const exclusivePackages = options.packages.filter((item) => item.scope === "exclusive" && item.price !== null);
  const availableUnits = options.units.filter((item) => item.active && item.price !== null);
  const selectedPackage = options.packages.find((item) => item.id === packageId);
  const multiDay = kind === "unit";
  const lastDay = end || start;
  const stayDays = start ? dayCount(start, lastDay) : 0;

  // Units that cannot be booked for every day of the chosen dates. Chosen units that became taken drop out automatically.
  const taken: ReturnType<typeof unitsTakenInRange> = start ? unitsTakenInRange(unitRows, start, lastDay) : new Map();
  const chosenUnitIds = selectedUnitIds.filter((id) => !taken.has(id) && availableUnits.some((unit) => unit.id === id));
  const chosenUnits = availableUnits.filter((unit) => chosenUnitIds.includes(unit.id));

  const corkage = parseCorkageRows(corkageRows.map((row) => row.label), corkageRows.map((row) => row.amount));
  const fees = options.entranceFees[visitType];
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const formatDay = (value: string) => dateFormatter.format(new Date(`${value}T12:00:00`));

  let priced: ReturnType<typeof priceStay> | ReturnType<typeof priceExclusive> | null = null;
  if (kind === "exclusive") {
    if (selectedPackage?.price != null) priced = priceExclusive({ packagePrice: selectedPackage.price, paxIncluded: selectedPackage.paxIncluded, extraGuestFee: options.extraGuestFee, guests: adults + children, corkage: corkage.items });
  } else if (fees.adult !== null && fees.child !== null && (kind === "entrance" || (chosenUnits.length > 0 && stayDays > 0))) {
    priced = priceStay({
      days: kind === "entrance" ? 1 : stayDays,
      adults,
      children,
      units: kind === "entrance" ? [] : chosenUnits.map((unit) => ({ id: unit.id, name: unit.name, price: unit.price ?? 0, freeEntrances: unit.freeEntranceCount })),
      adultFee: fees.adult,
      childFee: fees.child,
      corkage: corkage.items,
    });
  }
  const breakdown = priced?.ok ? priced.breakdown : null;

  const safeError = error && ["invalid", "date", "unavailable", "extraFee", "save"].includes(error) ? error : null;
  const errorText = safeError ? t(`errors.${safeError}` as never) : "";

  function changeKind(value: string) {
    setKind(value);
    // Whole-resort and entrance-only requests are one date, so drop any longer range.
    if (value !== "unit") setEnd("");
  }

  function pickDate(value: string) {
    if (!multiDay) { setStart(value); setEnd(""); return; }
    if (!start || end) { setStart(value); setEnd(""); return; }
    if (value < start) { setStart(value); return; }
    const capped = dayCount(start, value) > MAX_STAY_DAYS ? addDays(start, MAX_STAY_DAYS - 1) : value;
    setEnd(capped);
  }

  function toggleUnit(id: string) {
    setSelectedUnitIds(chosenUnitIds.includes(id) ? chosenUnitIds.filter((item) => item !== id) : [...chosenUnitIds, id]);
  }

  function editCorkage(key: number, field: "label" | "amount", value: string) {
    const rows = corkageRows.map((row) => (row.key === key ? { ...row, [field]: value } : row));
    const last = rows[rows.length - 1];
    if ((last.label || last.amount) && rows.length < MAX_CORKAGE_ROWS) {
      setCorkageRows([...rows, blankRow(nextRowKey)]);
      setNextRowKey(nextRowKey + 1);
    } else setCorkageRows(rows);
  }

  function removeCorkage(key: number) {
    const rows = corkageRows.filter((row) => row.key !== key);
    if (rows.length && !rows[rows.length - 1].label && !rows[rows.length - 1].amount) { setCorkageRows(rows); return; }
    setCorkageRows([...rows, blankRow(nextRowKey)]);
    setNextRowKey(nextRowKey + 1);
  }

  function addPreset(item: CorkageItem) {
    const filled = corkageRows.filter((row) => row.label || row.amount);
    if (filled.length >= MAX_CORKAGE_ROWS) return;
    setCorkageRows([...filled, { key: nextRowKey, label: item.label, amount: String(item.amount) }, blankRow(nextRowKey + 1)]);
    setNextRowKey(nextRowKey + 2);
  }

  const canSubmit = Boolean(start) && adults + children >= 1 && !corkage.invalid
    && !(kind === "exclusive" && !packageId) && !(kind === "unit" && chosenUnitIds.length === 0);

  return (
    <form id="booking-form" action={submitBookingRequest} className="booking-form">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="kind" value={kind} />
      <label className="booking-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      {errorText && <p className="booking-error" role="alert">{errorText}</p>}
      <fieldset className="booking-fieldset">
        <legend>{t("kind")}</legend>
        <div className="booking-kind-options">
          {["exclusive", "unit", "entrance"].map((value) => <label className={`booking-kind-option${kind === value ? " booking-kind-selected" : ""}`} key={value}>
            <input type="radio" name="kind_choice" value={value} checked={kind === value} onChange={() => changeKind(value)} />
            <span>{t(`kinds.${value}` as never)}</span>
          </label>)}
        </div>
      </fieldset>
      {kind === "exclusive" && <label>{t("package")}<select name="package_id" required value={packageId} onChange={(event) => setPackageId(event.target.value)}>
        {exclusivePackages.map((item) => <option value={item.id} key={item.id}>{item.name} · {peso.format(item.price!)}</option>)}
      </select>{selectedPackage?.paxIncluded !== null && <small>{t("includedGuests", { count: selectedPackage?.paxIncluded ?? 20 })}</small>}</label>}
      {kind !== "exclusive" && <label>{t("visitType")}<select name="visit_type" value={visitType} onChange={(event) => setVisitType(event.target.value === "overnight" ? "overnight" : "day-tour")}>
        <option value="day-tour">{t("dayTour")}</option><option value="overnight">{t("overnight")}</option>
      </select><small>{t("childAge")}</small></label>}
      <div className="booking-calendar-block"><div><h3>{t("chooseDate")}</h3><p>{multiDay ? t("rangeHint") : t("oneDateOnly")}</p></div>
        <AvailabilityCalendar
          days={days}
          locale={locale}
          minDate={minDate}
          maxDate={maxDate}
          selectedDate={start}
          rangeEnd={end || undefined}
          onSelect={pickDate}
          reserveType={kind === "exclusive" ? "exclusive" : "walk-in"}
          selectable
          labels={{
            previousMonth: t("calendar.previousMonth"),
            nextMonth: t("calendar.nextMonth"),
            available: t("calendar.available"),
            partial: t("calendar.partial"),
            exclusive: t("calendar.exclusive"),
            closed: t("calendar.closed"),
            legend: t("calendar.legend"),
          }}
        />
        <input type="hidden" name="date" value={start} />
        <input type="hidden" name="date_end" value={lastDay} />
        {start && <div className="booking-range-actions">
          <p className="booking-selected-date">{multiDay && stayDays > 1
            ? t("selectedRange", { start: formatDay(start), end: formatDay(lastDay), days: stayDays })
            : t("selectedDate", { date: new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(new Date(`${start}T12:00:00`)) })}</p>
          <button type="button" className="booking-link-button" onClick={() => { setStart(""); setEnd(""); }}>{t("startOver")}</button>
        </div>}
      </div>
      {kind === "unit" && <fieldset className="booking-fieldset">
        <legend>{t("unitsLabel")}</legend>
        <div className="booking-unit-list">
          {availableUnits.map((unit) => {
            const blocked = taken.get(unit.id);
            const checked = chosenUnitIds.includes(unit.id);
            return <label className={`booking-unit-option${checked ? " booking-unit-option-selected" : ""}${blocked ? " booking-unit-option-taken" : ""}`} key={unit.id}>
              <input type="checkbox" name="unit_id" value={unit.id} checked={checked} disabled={Boolean(blocked)} onChange={() => toggleUnit(unit.id)} />
              <span className="booking-unit-text">{unit.name} · {peso.format(unit.price!)}{blocked && <small>{t("unitTaken", { date: formatDay(blocked.firstDate) })}</small>}</span>
            </label>;
          })}
        </div>
        <small>{start ? t("unitPriceNote") : t("unitsHint")}</small>
      </fieldset>}
      <div className="booking-guest-count">
        <label>{t("adults")}<input type="number" name="adults" min="0" max="1000" value={adults} onChange={(event) => setAdults(Number(event.target.value))} required /></label>
        <label>{t("children")}<input type="number" name="children" min="0" max="1000" value={children} onChange={(event) => setChildren(Number(event.target.value))} required /></label>
      </div>
      <div className="booking-corkage">
        <h3>{t("corkageTitle")}</h3>
        <p>{t("corkageHelp")}</p>
        {options.corkagePresets.length > 0 && <div className="booking-chip-list">
          {options.corkagePresets.map((item) => <button type="button" className="booking-chip" key={item.label} onClick={() => addPreset(item)}>{t("corkagePreset", { label: item.label })}</button>)}
        </div>}
        {corkageRows.map((row, index) => <div className="booking-corkage-row" key={row.key}>
          <input name="corkage_label" maxLength={80} placeholder={t("corkageItem")} aria-label={t("corkageItem")} value={row.label} onChange={(event) => editCorkage(row.key, "label", event.target.value)} />
          <input name="corkage_amount" type="number" inputMode="decimal" min="0" step="any" placeholder={t("corkageAmount")} aria-label={t("corkageAmount")} value={row.amount} onChange={(event) => editCorkage(row.key, "amount", event.target.value)} />
          {index < corkageRows.length - 1 || row.label || row.amount
            ? <button type="button" className="booking-corkage-remove" aria-label={t("corkageRemove")} onClick={() => removeCorkage(row.key)}>×</button>
            : <span />}
        </div>)}
      </div>
      <div className="booking-form-divider"><span>{t("contactDetails")}</span></div>
      <div className="booking-guest-count">
        <label>{t("guestName")}<input name="guest_name" maxLength={160} autoComplete="name" required /></label>
        <label>{t("phone")}<input name="phone" type="tel" maxLength={40} autoComplete="tel" required /></label>
      </div>
      <div className="booking-guest-count">
        <label>{t("emailOptional")}<input name="guest_email" type="email" maxLength={254} autoComplete="email" /></label>
        <label>{t("messengerOptional")}<input name="contact_extra" maxLength={120} /></label>
      </div>
      <label>{t("notesOptional")}<textarea name="notes" rows={3} maxLength={1000} placeholder={t("notesPlaceholder")} /></label>
      <div className="booking-total">
        <span>{t("requestEstimate")}</span>
        <strong>{breakdown ? peso.format(breakdown.total) : t("contactForTotal")}</strong>
        {breakdown && <ul className="booking-breakdown" aria-label={t("summaryTitle")}>
          {breakdown.kind === "exclusive" ? <>
            <li><span>{t("summaryPackage")}</span><span>{peso.format(breakdown.packagePrice)}</span></li>
            {breakdown.extraGuests > 0 && <li><span>{t("summaryExtra")} ({breakdown.extraGuests})</span><span>{peso.format(breakdown.extraSubtotal)}</span></li>}
          </> : <>
            {breakdown.unitLines.length > 0 && <li><span>{t("summaryUnits")} · {t("summaryDays", { count: breakdown.days })}</span><span>{peso.format(breakdown.unitsSubtotal)}</span></li>}
            <li><span>{t("summaryEntrance")}</span><span>{peso.format(breakdown.entranceGross)}</span></li>
            {breakdown.freeCredit > 0 && <li className="booking-breakdown-credit"><span>{t("summaryFree")}</span><span>−{peso.format(breakdown.freeCredit)}</span></li>}
          </>}
          {breakdown.corkageSubtotal > 0 && <li><span>{t("summaryCorkage")}</span><span>{peso.format(breakdown.corkageSubtotal)}</span></li>}
        </ul>}
        <small>{t("estimateNote")}</small>
      </div>
      <label className="booking-consent"><input type="checkbox" required /><span>{t("privacyConsent")}</span></label>
      <button className="button button-blue booking-submit" type="submit" disabled={!canSubmit}>{t("submit")}</button>
      <p className="booking-safe-note">{t("pendingNote")}</p>
    </form>
  );
}
