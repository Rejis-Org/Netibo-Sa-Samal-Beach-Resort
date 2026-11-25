"use client";

import { useMemo, useState } from "react";
import type { AvailabilityDay } from "@/lib/booking-data";
import type { AppLocale } from "@/i18n/routing";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

type CalendarProps = {
  days: AvailabilityDay[];
  locale: AppLocale;
  minDate: string;
  maxDate: string;
  selectedDate?: string;
  /** When set with selectedDate, the days from selectedDate through rangeEnd are highlighted as one stay. */
  rangeEnd?: string;
  /** Let closed/exclusive days be tapped (used to inspect a day rather than pick it). */
  allowUnavailable?: boolean;
  onSelect?: (date: string) => void;
  reserveType?: "exclusive" | "walk-in";
  selectable?: boolean;
  labels: {
    previousMonth: string;
    nextMonth: string;
    available: string;
    partial: string;
    exclusive: string;
    closed: string;
    legend: string;
  };
};

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function AvailabilityCalendar({ days, locale, minDate, maxDate, selectedDate, rangeEnd, allowUnavailable = false, onSelect, reserveType = "walk-in", selectable = false, labels }: CalendarProps) {
  const [month, setMonth] = useState(() => {
    const today = parseDate(minDate);
    return new Date(today.getFullYear(), today.getMonth(), 1, 12);
  });
  const stateByDate = useMemo(() => new Map(days.map((item) => [item.date, item.state])), [days]);
  const minMonth = parseDate(minDate);
  const maxMonth = parseDate(maxDate);
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const gridStart = new Date(monthStart);
  gridStart.setDate(1 - monthStart.getDay());
  const gridDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2024, 0, 7 + index, 12);
    return dayFormatter.format(date);
  });
  const canGoBack = month.getFullYear() > minMonth.getFullYear() || month.getMonth() > minMonth.getMonth();
  const canGoForward = month.getFullYear() < maxMonth.getFullYear() || month.getMonth() < maxMonth.getMonth();

  return (
    <div className="availability-calendar">
      <div className="calendar-month-heading">
        <button type="button" className="calendar-month-button" aria-label={labels.previousMonth} disabled={!canGoBack} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))}><ChevronLeftIcon size={20} /></button>
        <h3>{monthFormatter.format(month)}</h3>
        <button type="button" className="calendar-month-button" aria-label={labels.nextMonth} disabled={!canGoForward} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))}><ChevronRightIcon size={20} /></button>
      </div>
      <div className="calendar-grid" role="grid" aria-label={monthFormatter.format(month)}>
        {weekdays.map((weekday, index) => <span role="columnheader" className="calendar-weekday" key={`${weekday}-${index}`}>{weekday}</span>)}
        {gridDays.map((date) => {
          const value = dateValue(date);
          const inMonth = date.getMonth() === month.getMonth();
          const state = stateByDate.get(value);
          const past = value < minDate;
          const beyondWindow = value > maxDate;
          const unavailable = state === "closed" || state === "exclusive" || (reserveType === "exclusive" && state === "partial");
          const disabled = past || beyondWindow || (selectable && !allowUnavailable ? unavailable : false);
          const inRange = Boolean(selectedDate && rangeEnd && value > selectedDate && value < rangeEnd);
          const isSelected = selectedDate === value || rangeEnd === value;
          const stateLabel = state ? labels[state] : labels.available;
          const className = [
            "calendar-day",
            !inMonth && "calendar-day-outside",
            state && `calendar-day-${state}`,
            isSelected && "calendar-day-selected",
            inRange && "calendar-day-in-range",
            disabled && "calendar-day-disabled",
          ].filter(Boolean).join(" ");
          return (
            <button
              key={value}
              type="button"
              className={className}
              aria-label={`${new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(date)}: ${stateLabel}`}
              aria-pressed={isSelected}
              disabled={disabled}
              onClick={() => onSelect?.(value)}
            >
              <span>{date.getDate()}</span>
              {state && <span className="calendar-day-mark" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <div className="calendar-legend" aria-label={labels.legend}>
        <span><i className="legend-dot legend-available" />{labels.available}</span>
        <span><i className="legend-dot legend-partial" />{labels.partial}</span>
        <span><i className="legend-dot legend-exclusive" />{labels.exclusive}</span>
        <span><i className="legend-dot legend-closed" />{labels.closed}</span>
      </div>
    </div>
  );
}
