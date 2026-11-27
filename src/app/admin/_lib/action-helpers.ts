import type { Json } from "@/lib/supabase/database.types";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

export function readText(formData: FormData, name: string, max = 250) {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : null;
}

export function readInteger(formData: FormData, name: string, allowBlank = false) {
  const value = readText(formData, name, 30);
  if (value === null || (value === "" && allowBlank)) return value === "" ? null : undefined;
  if (!value || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : undefined;
}

export async function logChange(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  actorId: string,
  table: string,
  targetId: string,
  oldData: Json | null,
  newData: Json,
) {
  const { error } = await supabase.from("audit_log").insert({
    actor_id: actorId,
    action: "updated",
    target_table: table,
    target_id: targetId,
    old_data: oldData,
    new_data: newData,
  });
  if (error) throw new Error("The change was saved, but its audit entry could not be written.");
}

export function validDateText(value: string | null): value is string {
  return Boolean(
    value &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value,
  );
}

// Money that may have centavos, such as a total that includes corkage. Blank is null; anything invalid is undefined.
export function readMoney(formData: FormData, name: string) {
  const value = readText(formData, name, 20);
  if (value === null) return undefined;
  if (value === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return undefined;
  const number = Number(value);
  return number <= 100_000_000 ? number : undefined;
}

export function readStrings(formData: FormData, name: string, max: number) {
  return formData.getAll(name).map((value) => (typeof value === "string" ? value.trim().slice(0, max) : ""));
}
