"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Json } from "@/lib/supabase/database.types";
import { getAdminContext } from "@/lib/supabase/admin";
import { readText, readInteger, logChange } from "@/app/admin/_lib/action-helpers";

type UnitType = "cottage" | "room" | "hall" | "kubo";
const UNIT_TYPES: readonly string[] = ["cottage", "room", "hall", "kubo"];
const PHOTO_BUCKET_PATH = "/storage/v1/object/public/unit-photos/";

export type CreateUnitState = { error?: string; saved?: boolean } | null;

// Photos must be a file shipped with the site (/images/...) or an upload in our own storage bucket.
// Anything else is dropped, because the public page only loads images from those two places.
function allowedPhotoPrefixes() {
  const prefixes = ["/images/"];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) prefixes.push(`${supabaseUrl.replace(/\/+$/, "")}${PHOTO_BUCKET_PATH}`);
  return prefixes;
}

// Reads and checks the fields shared by "add" and "save" for a cottage or room. Returns null when something is invalid.
function parseUnitFields(formData: FormData) {
  const name = readText(formData, "name", 120);
  const type = readText(formData, "type", 20);
  const price = readInteger(formData, "price", true);
  const capacityMin = readInteger(formData, "capacity_min", true);
  const capacityMax = readInteger(formData, "capacity_max", true);
  const photosRaw = readText(formData, "photos", 4000);
  const priceNote = readText(formData, "price_note", 300);
  const freeEntrance = readInteger(formData, "free_entrance_count");

  if (
    !name ||
    !type ||
    !UNIT_TYPES.includes(type) ||
    price === undefined ||
    capacityMin === undefined ||
    capacityMax === undefined ||
    photosRaw === null ||
    priceNote === null ||
    freeEntrance === undefined ||
    freeEntrance === null ||
    freeEntrance > 1000
  ) {
    return null;
  }
  if (
    (capacityMin !== null && capacityMin > 10_000) ||
    (capacityMax !== null && capacityMax > 10_000) ||
    (capacityMin !== null && capacityMax !== null && capacityMin > capacityMax) ||
    (price !== null && price > 100_000_000)
  ) {
    return null;
  }

  const prefixes = allowedPhotoPrefixes();
  const photos = photosRaw
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item && prefixes.some((prefix) => item.startsWith(prefix)))
    .slice(0, 12);

  return {
    name,
    type: type as UnitType,
    capacity_min: capacityMin,
    capacity_max: capacityMax,
    aircon: formData.get("aircon") === "on",
    has_own_cr: formData.get("has_own_cr") === "on",
    price_amount: price,
    price_note: priceNote || null,
    free_entrance_count: freeEntrance,
    photos,
    active: formData.get("active") === "on",
  };
}

function slugify(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "unit";
}

// Deletes uploaded files that a unit no longer lists. Files shipped in /images are never touched.
// Best effort: a failure here must not undo the save.
async function removeUnusedUploads(
  supabase: NonNullable<Awaited<ReturnType<typeof getAdminContext>>>["supabase"],
  before: string[],
  after: string[],
) {
  const keep = new Set(after);
  const paths = before
    .filter((url) => !keep.has(url))
    .map((url) => {
      const at = url.indexOf(PHOTO_BUCKET_PATH);
      return at === -1 ? null : decodeURIComponent(url.slice(at + PHOTO_BUCKET_PATH.length));
    })
    .filter((path): path is string => Boolean(path));
  if (paths.length === 0) return;
  try {
    await supabase.storage.from("unit-photos").remove(paths);
  } catch {
    // The leftover files are harmless; the next save will not retry them.
  }
}

export async function createUnitAction(_previous: CreateUnitState, formData: FormData): Promise<CreateUnitState> {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");

  const fields = parseUnitFields(formData);
  if (!fields) {
    return {
      error:
        "Please check the fields. A name is required, and guests, price and entrances must be whole numbers (minimum guests cannot be above maximum).",
    };
  }

  const base = slugify(fields.name);
  const [{ data: sameSlug }, { data: lastUnit }] = await Promise.all([
    admin.supabase.from("units").select("slug").like("slug", `${base}%`),
    admin.supabase.from("units").select("sort_order").order("sort_order", { ascending: false }).limit(1),
  ]);
  const taken = new Set((sameSlug ?? []).map((row) => row.slug));
  let slug = base;
  for (let number = 2; taken.has(slug); number += 1) slug = `${base}-${number}`;

  const row = {
    ...fields,
    slug,
    sort_order: (lastUnit?.[0]?.sort_order ?? 0) + 10,
    currency: "PHP" as const,
    description: {} as Json,
  };
  const { data: created, error } = await admin.supabase.from("units").insert(row).select("id").single();
  if (error || !created) {
    return { error: "The cottage or room could not be saved. Check the details and try again." };
  }
  try {
    await logChange(admin.supabase, admin.userId, "units", created.id, null, row as unknown as Json, "created");
  } catch {
    // The unit is saved; only its audit entry failed.
  }
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function saveUnitAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");

  const id = readText(formData, "id", 64);
  const sortOrder = readInteger(formData, "sort_order");
  const fields = parseUnitFields(formData);
  if (!id || !fields || sortOrder === undefined || sortOrder === null || sortOrder > 100_000) {
    redirect("/admin/units?error=unit");
  }

  const { data: oldRow, error: readError } = await admin.supabase.from("units").select("*").eq("id", id).maybeSingle();
  if (readError || !oldRow) redirect("/admin/units?error=unit");
  const update = { ...fields, sort_order: sortOrder };
  const { error } = await admin.supabase.from("units").update(update).eq("id", id);
  if (error) redirect("/admin/units?error=unit");
  await removeUnusedUploads(admin.supabase, oldRow.photos, update.photos);
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
