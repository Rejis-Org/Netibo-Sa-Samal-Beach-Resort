import type { ComponentProps } from "react";
import type { UnitAvailabilityRow } from "@/lib/availability";
import type { getBookingOptions } from "@/lib/booking-data";
import type { ManualBookingForm } from "../_components/bookings/manual-booking-form";

type BookingOptions = NonNullable<Awaited<ReturnType<typeof getBookingOptions>>>;

export function manualBookingFormProps(
  options: BookingOptions,
  unitRows: UnitAvailabilityRow[] | null | undefined,
  today: string,
): Omit<ComponentProps<typeof ManualBookingForm>, "walkIn"> {
  return {
    packages: options.packages
      .filter((item) => item.scope === "exclusive" && item.price !== null)
      .map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        paxIncluded: item.paxIncluded,
        weekdayOnly: item.weekdayOnly,
        weekendOnly: item.weekendOnly,
      })),
    units: options.units.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      freeEntranceCount: item.freeEntranceCount,
    })),
    unitRows: unitRows ?? [],
    entranceFees: options.entranceFees,
    extraGuestFee: options.extraGuestFee,
    today,
  };
}
