export type ResortUnit = {
  name: string;
  capacity: string | null;
  price: number | null;
  features: readonly ("aircon" | "ownCr")[];
};

export const exclusivePackages = [
  { name: "Exclusive Weekdays", price: 10_000, included: 20, days: "weekday" },
  { name: "Exclusive Weekends", price: 12_000, included: 20, days: "weekend" },
  { name: "Exclusive with 6 aircon rooms", price: 13_000, included: 20, days: "any" },
] as const;

export const entranceFees = [
  { name: "Day tour", adultPrice: 65, childPrice: 30 },
  { name: "Overnight", adultPrice: 85, childPrice: 50 },
] as const;

export const resortUnits: readonly ResortUnit[] = [
  { name: "Casa Liam", capacity: "6–8", price: 2_500, features: [] },
  { name: "Villa Aryanna", capacity: "6", price: 2_300, features: [] },
  { name: "Mapitag Function Hall", capacity: null, price: 2_500, features: [] },
  { name: "Alexa", capacity: "2", price: 1_500, features: [] },
  { name: "Cabins Adrean", capacity: "2", price: 1_500, features: [] },
  { name: "Aqua Blaire", capacity: "2–4", price: 500, features: [] },
  { name: "Open Cottage", capacity: "3–4", price: 500, features: [] },
  { name: "Umbrella Kubo", capacity: null, price: 150, features: [] },
  { name: "Room 1", capacity: "2", price: null, features: ["aircon", "ownCr"] },
  { name: "Room 2", capacity: "2", price: null, features: ["aircon", "ownCr"] },
  { name: "Room 3", capacity: "2", price: null, features: ["aircon", "ownCr"] },
];
