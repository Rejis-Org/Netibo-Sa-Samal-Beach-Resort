export const errorMessages: Record<string, string> = {
  unit: "Please check the unit fields and try saving again.",
  package: "Please check the package fields and try saving again.",
  settings: "Please check the setting value and try saving again.",
  access: "Only the owner account can change resort settings.",
  booking: "That booking could not be updated. Refresh the list and try again.",
  deadline: "Set a payment deadline in Resort settings before approving a request.",
  conflict: "Those dates were just taken by another approved booking. The request remains pending.",
  manual: "That booking could not be saved. Check the details; the date or place may already be taken.",
  blocked: "That closed date could not be saved or removed. Check it and try again.",
  blockedExists: "That date is already closed.",
  blockedConflict: "That date already has an approved or confirmed booking. Cancel that booking first.",
  extend: "That stay could not be extended. Only confirmed or awaiting-payment room bookings can be extended.",
  extendConflict: "Those extra days are already booked or closed, so the stay was not extended.",
  price:
    "The price could not be calculated because a price or entrance fee is missing. Check the catalog and try again.",
  checkin: "That check-in or check-out could not be saved. Refresh the logbook and try again.",
  alreadyIn: "That booking is already checked in.",
};

export const savedMessages: Record<string, string> = {
  manual: "Booking saved. The date is now on the calendar.",
  unitAdded: "Cottage or room added. The public pages now show the latest catalog.",
  booking: "Booking updated.",
  extended: "The stay was extended.",
  checkin: "Guest checked in.",
  checkout: "Guest checked out.",
};

export type Flash = { error?: string; saved?: string; receipt?: string };
