import type { Json } from "@/lib/supabase/database.types";
import { peso } from "@/app/admin/_lib/format";

/** One line explaining how a booking's total was built, read from its saved price snapshot. */
export function breakdownSummary(value: Json | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data: Record<string, Json | undefined> = value;
  const num = (key: string) => {
    const entry = data[key];
    return typeof entry === "number" ? entry : null;
  };
  const money = (key: string) => {
    const entry = num(key);
    return entry === null ? null : peso.format(entry);
  };
  const parts: string[] = [];
  if (data.kind === "stay") {
    const rooms = num("unitsSubtotal");
    const days = num("days");
    if (rooms !== null && rooms > 0)
      parts.push(`Rooms ${money("unitsSubtotal")}${days !== null && days > 1 ? ` (${days} days)` : ""}`);
    if (money("entranceGross")) parts.push(`Entrance ${money("entranceGross")}`);
    const credit = num("freeCredit");
    if (credit !== null && credit > 0) parts.push(`free entrance −${money("freeCredit")}`);
  } else if (data.kind === "exclusive") {
    if (money("packagePrice")) parts.push(`Package ${money("packagePrice")}`);
    const extra = num("extraSubtotal");
    if (extra !== null && extra > 0) parts.push(`extra guests ${money("extraSubtotal")}`);
  } else return null;
  const corkageTotal = num("corkageSubtotal");
  if (corkageTotal !== null && corkageTotal > 0) parts.push(`corkage ${money("corkageSubtotal")}`);
  return parts.join(" · ");
}
