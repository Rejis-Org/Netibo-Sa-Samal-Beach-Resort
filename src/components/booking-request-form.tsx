"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import type { AvailabilityDay, BookingOptions } from "@/lib/booking-data";
import type { AppLocale } from "@/i18n/routing";
import { submitBookingRequest } from "@/app/[locale]/book/actions";

type Props = {
  locale: AppLocale;
  options: NonNullable<BookingOptions>;
  days: AvailabilityDay[];
  minDate: string;
  maxDate: string;
  error?: string;
  initialDate?: string;
};

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

export function BookingRequestForm({ locale, options, days, minDate, maxDate, error, initialDate }: Props) {
  const t = useTranslations("pages.bookingFlow");
  const [kind, setKind] = useState("exclusive");
  const [packageId, setPackageId] = useState(options.packages.find((item) => item.scope === "exclusive")?.id ?? "");
  const [unitId, setUnitId] = useState("");
  const [visitType, setVisitType] = useState("day-tour");
  const [date, setDate] = useState(initialDate ?? "");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const exclusivePackages = options.packages.filter((item) => item.scope === "exclusive" && item.price !== null);
  const entrancePackages = options.packages.filter((item) => item.scope === "walk-in");
  const availableUnits = options.units.filter((item) => item.active && item.price !== null);
  const selectedPackage = options.packages.find((item) => item.id === packageId);
  const selectedUnit = availableUnits.find((item) => item.id === unitId);
  const adultFee = entrancePackages.find((item) => item.slug === `${visitType}-adult`)?.price ?? null;
  const childFee = entrancePackages.find((item) => item.slug === `${visitType}-child-5-10`)?.price ?? null;
  let total: number | null;
  if (kind === "exclusive") {
    if (!selectedPackage?.price) total = null;
    else {
      const headcount = adults + children;
      total = selectedPackage.paxIncluded !== null && headcount > selectedPackage.paxIncluded
        ? options.extraGuestFee === null ? null : selectedPackage.price + (headcount - selectedPackage.paxIncluded) * options.extraGuestFee
        : selectedPackage.price;
    }
  } else if (kind === "unit") total = selectedUnit?.price ?? null;
  else total = adultFee !== null && childFee !== null ? adults * adultFee + children * childFee : null;
  const safeError = error && ["invalid", "date", "unavailable", "extraFee", "save"].includes(error) ? error : null;
  const errorText = safeError ? t(`errors.${safeError}` as never) : "";

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
            <input type="radio" name="kind_choice" value={value} checked={kind === value} onChange={() => setKind(value)} />
            <span>{t(`kinds.${value}` as never)}</span>
          </label>)}
        </div>
      </fieldset>
      {kind === "exclusive" && <label>{t("package")}<select name="package_id" required value={packageId} onChange={(event) => setPackageId(event.target.value)}>
        {exclusivePackages.map((item) => <option value={item.id} key={item.id}>{item.name} · {peso.format(item.price!)}</option>)}
      </select>{selectedPackage?.paxIncluded !== null && <small>{t("includedGuests", { count: selectedPackage?.paxIncluded ?? 20 })}</small>}</label>}
      {kind === "unit" && <label>{t("unit")}<select name="unit_id" required value={unitId} onChange={(event) => setUnitId(event.target.value)}>
        <option value="">{t("chooseUnit")}</option>{availableUnits.map((item) => <option value={item.id} key={item.id}>{item.name} · {peso.format(item.price!)}</option>)}
      </select><small>{t("unitPriceNote")}</small></label>}
      {kind === "entrance" && <label>{t("visitType")}<select name="visit_type" value={visitType} onChange={(event) => setVisitType(event.target.value)}>
        <option value="day-tour">{t("dayTour")}</option><option value="overnight">{t("overnight")}</option>
      </select><small>{t("childAge")}</small></label>}
      <div className="booking-calendar-block"><div><h3>{t("chooseDate")}</h3><p>{t("oneDateOnly")}</p></div>
        <AvailabilityCalendar
          days={days}
          locale={locale}
          minDate={minDate}
          maxDate={maxDate}
          selectedDate={date}
          onSelect={setDate}
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
        <input type="hidden" name="date" value={date} />
        {date && <p className="booking-selected-date">{t("selectedDate", { date: new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(new Date(`${date}T12:00:00`)) })}</p>}
      </div>
      <div className="booking-guest-count">
        <label>{t("adults")}<input type="number" name="adults" min="0" max="1000" value={adults} onChange={(event) => setAdults(Number(event.target.value))} required /></label>
        <label>{t("children")}<input type="number" name="children" min="0" max="1000" value={children} onChange={(event) => setChildren(Number(event.target.value))} required /></label>
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
      <div className="booking-total"><span>{t("requestEstimate")}</span><strong>{total === null ? t("contactForTotal") : peso.format(total)}</strong><small>{t("estimateNote")}</small></div>
      <label className="booking-consent"><input type="checkbox" required /><span>{t("privacyConsent")}</span></label>
      <button className="button button-blue booking-submit" type="submit" disabled={!date || (kind === "exclusive" && !packageId) || (kind === "unit" && !unitId)}>{t("submit")}</button>
      <p className="booking-safe-note">{t("pendingNote")}</p>
    </form>
  );
}
