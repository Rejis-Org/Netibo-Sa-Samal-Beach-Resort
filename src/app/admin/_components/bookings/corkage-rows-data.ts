import type { CorkageItem } from "@/lib/pricing";

export type CorkageRowValue = { key: number; label: string; amount: string };

/**
 * Starting rows for the corkage fields: every saved item, or one empty slot when there are none.
 * More slots are added with the "Add corkage" button.
 */
export function corkageRows(items: CorkageItem[]): CorkageRowValue[] {
  const rows = items.map((item) => ({ label: item.label, amount: String(item.amount) }));
  if (rows.length === 0) rows.push({ label: "", amount: "" });
  return rows.map((row, key) => ({ key, ...row }));
}
