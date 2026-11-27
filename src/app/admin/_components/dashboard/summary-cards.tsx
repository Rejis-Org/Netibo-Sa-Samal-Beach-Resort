import Link from "next/link";
import { sectionHref } from "@/app/admin/_lib/admin-sections";
import type { Database } from "@/lib/supabase/database.types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

type SummaryCardsProps = {
  pendingBookings: Booking[];
  awaitingCount: number;
  upcoming: Booking[];
  activeUnits: number;
  totalUnits: number;
};

export function SummaryCards({ pendingBookings, awaitingCount, upcoming, activeUnits, totalUnits }: SummaryCardsProps) {
  return (
    <section className="admin-summary-grid" aria-label="Resort overview">
      <Link href={sectionHref("bookings")}>
        <span>Pending requests</span>
        <strong>{pendingBookings.length}</strong>
        <em>Need your approval</em>
      </Link>
      <Link href={sectionHref("bookings")}>
        <span>Awaiting payment</span>
        <strong>{awaitingCount}</strong>
        <em>Approved, deposit not paid yet</em>
      </Link>
      <Link href={sectionHref("bookings")}>
        <span>Upcoming bookings</span>
        <strong>{upcoming.length}</strong>
        <em>Awaiting payment or confirmed</em>
      </Link>
      <Link href={sectionHref("units")}>
        <span>Active listings</span>
        <strong>
          {activeUnits}
          <small> / {totalUnits}</small>
        </strong>
        <em>Cottages and rooms shown to guests</em>
      </Link>
    </section>
  );
}
