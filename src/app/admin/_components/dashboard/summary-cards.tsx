import { sectionHref } from "@/app/admin/_lib/admin-sections";
import { MotionCardLink } from "@/app/admin/_components/ui/motion-card-link";
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
      <MotionCardLink href={sectionHref("bookings")}>
        <span>Pending requests</span>
        <strong>{pendingBookings.length}</strong>
        <em>Need your approval</em>
      </MotionCardLink>
      <MotionCardLink href={sectionHref("bookings")}>
        <span>Awaiting payment</span>
        <strong>{awaitingCount}</strong>
        <em>Approved, deposit not paid yet</em>
      </MotionCardLink>
      <MotionCardLink href={sectionHref("bookings")}>
        <span>Upcoming bookings</span>
        <strong>{upcoming.length}</strong>
        <em>Awaiting payment or confirmed</em>
      </MotionCardLink>
      <MotionCardLink href={sectionHref("units")}>
        <span>Active listings</span>
        <strong>
          {activeUnits}
          <small> / {totalUnits}</small>
        </strong>
        <em>Cottages and rooms shown to guests</em>
      </MotionCardLink>
    </section>
  );
}
