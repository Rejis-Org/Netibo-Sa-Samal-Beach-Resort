"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import type { AvailabilityDay } from "@/lib/booking-data";
import type { UnitAvailabilityRow } from "@/lib/availability";
import type { AppLocale } from "@/i18n/routing";

type Props = {
  days: AvailabilityDay[];
  unitRows: UnitAvailabilityRow[];
  units: { id: string; name: string; price: number | null }[];
  locale: AppLocale;
  minDate: string;
  maxDate: string;
};

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

/** The public calendar plus a panel listing which cottages and rooms are free on the tapped day. No guest details are shown. */
export function ScheduleExplorer({ days, unitRows, units, locale, minDate, maxDate }: Props) {
  const t = useTranslations("pages.schedule");
  const [day, setDay] = useState("");
  const stateByUnit = new Map(unitRows.filter((row) => row.day === day).map((row) => [row.unit_id, row.state]));
  const freeCount = units.filter((unit) => !stateByUnit.has(unit.id)).length;
  const stateLabel = (state: string | undefined) => {
    if (state === "booked") return t("booked");
    if (state === "exclusive") return t("resortReserved");
    if (state === "closed") return t("closedDay");
    return t("free");
  };

  return (
    <>
      <AvailabilityCalendar
        days={days}
        locale={locale}
        minDate={minDate}
        maxDate={maxDate}
        selectedDate={day}
        onSelect={setDay}
        selectable
        allowUnavailable
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
      {units.length > 0 && <div className="day-panel" aria-live="polite">
        {day ? <>
          <h3>{t("dayTitle", { date: new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(new Date(`${day}T12:00:00`)) })}</h3>
          <p>{t("freeCount", { free: freeCount, total: units.length })}</p>
          <ul className="day-panel-list">
            {units.map((unit) => {
              const state = stateByUnit.get(unit.id);
              return <li key={unit.id} className={state ? "day-panel-booked" : undefined}>
                <span>{unit.name}{unit.price !== null && <small>{t("perDay", { price: peso.format(unit.price) })}</small>}</span>
                <span className="day-panel-state">{stateLabel(state)}</span>
              </li>;
            })}
          </ul>
        </> : <p>{t("dayHint")}</p>}
      </div>}
    </>
  );
}
