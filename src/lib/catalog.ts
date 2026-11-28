// Fallback prices used only when the database is not configured.
// Cottages and rooms now come from the database (admin "Cottages and rooms" page).
export const exclusivePackages = [
  { name: "Exclusive Weekdays", price: 10_000, included: 20, days: "weekday" },
  { name: "Exclusive Weekends", price: 12_000, included: 20, days: "weekend" },
  { name: "Exclusive with 6 aircon rooms", price: 13_000, included: 20, days: "any" },
] as const;

export const entranceFees = [
  { name: "Day tour", adultPrice: 65, childPrice: 30 },
  { name: "Overnight", adultPrice: 85, childPrice: 50 },
] as const;
