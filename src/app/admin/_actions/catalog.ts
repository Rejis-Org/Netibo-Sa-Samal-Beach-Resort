"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Json } from "@/lib/supabase/database.types";
import { getAdminContext } from "@/lib/supabase/admin";
import { readText, readInteger, logChange } from "@/app/admin/_lib/action-helpers";

export async function saveUnitAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");

  const id = readText(formData, "id", 64);
  const name = readText(formData, "name", 120);
  const type = readText(formData, "type", 20);
  const price = readInteger(formData, "price", true);
  const capacityMin = readInteger(formData, "capacity_min", true);
  const capacityMax = readInteger(formData, "capacity_max", true);
  const sortOrder = readInteger(formData, "sort_order");
  const photosRaw = readText(formData, "photos", 2000);
  const priceNote = readText(formData, "price_note", 300);
  const freeEntrance = readInteger(formData, "free_entrance_count");

  if (
    !id ||
    !name ||
    !type ||
    !["cottage", "room", "hall", "kubo"].includes(type) ||
    price === undefined ||
    capacityMin === undefined ||
    capacityMax === undefined ||
    sortOrder === undefined ||
    sortOrder === null ||
    photosRaw === null ||
    priceNote === null ||
    freeEntrance === undefined ||
    freeEntrance === null ||
    freeEntrance > 1000
  ) {
    redirect("/admin/units?error=unit");
  }
  if (
    (capacityMin !== null && capacityMin > 10_000) ||
    (capacityMax !== null && capacityMax > 10_000) ||
    sortOrder > 100_000 ||
    (capacityMin !== null && capacityMax !== null && capacityMin > capacityMax) ||
    (price !== null && price > 100_000_000)
  ) {
    redirect("/admin/units?error=unit");
  }

  const { data: oldRow, error: readError } = await admin.supabase.from("units").select("*").eq("id", id).maybeSingle();
  if (readError || !oldRow) redirect("/admin/units?error=unit");
  const update = {
    name,
    type: type as "cottage" | "room" | "hall" | "kubo",
    capacity_min: capacityMin,
    capacity_max: capacityMax,
    aircon: formData.get("aircon") === "on",
    has_own_cr: formData.get("has_own_cr") === "on",
    price_amount: price,
    price_note: priceNote || null,
    free_entrance_count: freeEntrance,
    photos: photosRaw
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12),
    active: formData.get("active") === "on",
    sort_order: sortOrder,
  };
  const { error } = await admin.supabase.from("units").update(update).eq("id", id);
  if (error) redirect("/admin/units?error=unit");
  await logChange(admin.supabase, admin.userId, "units", id, oldRow as unknown as Json, update as unknown as Json);
  revalidatePath("/", "layout");
  redirect("/admin/units?saved=unit");
}

export async function savePackageAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");

  const id = readText(formData, "id", 64);
  const nameEn = readText(formData, "name_en", 120);
  const nameFil = readText(formData, "name_fil", 120);
  const nameCeb = readText(formData, "name_ceb", 120);
  const price = readInteger(formData, "price", true);
  const pax = readInteger(formData, "pax_included", true);
  const sortOrder = readInteger(formData, "sort_order");
  const scope = readText(formData, "scope", 20);
  const notesEn = readText(formData, "notes_en", 1000);
  const notesFil = readText(formData, "notes_fil", 1000);
  const notesCeb = readText(formData, "notes_ceb", 1000);
  if (
    !id ||
    !nameEn ||
    !nameFil ||
    !nameCeb ||
    price === undefined ||
    pax === undefined ||
    sortOrder === undefined ||
    sortOrder === null ||
    !scope ||
    !["exclusive", "walk-in"].includes(scope) ||
    notesEn === null ||
    notesFil === null ||
    notesCeb === null
  ) {
    redirect("/admin/packages?error=package");
  }
  if (
    (price !== null && price > 100_000_000) ||
    (pax !== null && pax > 10_000) ||
    sortOrder > 100_000 ||
    (formData.get("weekday_only") === "on" && formData.get("weekend_only") === "on")
  ) {
    redirect("/admin/packages?error=package");
  }

  const { data: oldRow, error: readError } = await admin.supabase
    .from("packages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (readError || !oldRow) redirect("/admin/packages?error=package");
  const update = {
    name: { en: nameEn, fil: nameFil, ceb: nameCeb },
    scope: scope as "exclusive" | "walk-in",
    price_amount: price,
    pax_included: pax,
    weekday_only: formData.get("weekday_only") === "on",
    weekend_only: formData.get("weekend_only") === "on",
    notes: { en: notesEn, fil: notesFil, ceb: notesCeb },
    active: formData.get("active") === "on",
    sort_order: sortOrder,
  };
  const { error } = await admin.supabase.from("packages").update(update).eq("id", id);
  if (error) redirect("/admin/packages?error=package");
  await logChange(admin.supabase, admin.userId, "packages", id, oldRow as unknown as Json, update as unknown as Json);
  revalidatePath("/", "layout");
  redirect("/admin/packages?saved=package");
}
