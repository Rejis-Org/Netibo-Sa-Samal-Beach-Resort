"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ArrowUpRightIcon } from "@/components/icons";

// Resort dates are Philippine dates, same rule the booking page uses on the server.
function manilaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function HeroBookingBar() {
  const t = useTranslations("home");
  const router = useRouter();
  const [date, setDate] = useState("");
  // Same Manila date on the server and the client, except for a moment around midnight.
  const min = manilaToday();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(date ? `/book?date=${encodeURIComponent(date)}` : "/book");
  }

  return (
    <form className="hero-bar" onSubmit={handleSubmit} aria-label={t("heroBarLabel")}>
      <label>
        <span>{t("heroDateLabel")}</span>
        <input type="date" value={date} min={min} suppressHydrationWarning onChange={(event) => setDate(event.target.value)} />
      </label>
      <button className="button button-blue" type="submit">
        {t("heroDateAction")}
        <ArrowUpRightIcon size={18} />
      </button>
    </form>
  );
}
