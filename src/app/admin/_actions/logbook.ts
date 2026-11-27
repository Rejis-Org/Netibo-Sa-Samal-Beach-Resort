"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Json } from "@/lib/supabase/database.types";
import { getAdminContext } from "@/lib/supabase/admin";
import { manilaToday } from "@/lib/booking-data";
import { readText, readInteger, logChange } from "@/app/admin/_lib/action-helpers";

// Logbook: a guest arrives. The stay must cover today and be confirmed or awaiting payment.
export async function checkInAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");
  const id = readText(formData, "booking_id", 64);
  const adults = readInteger(formData, "adults");
  const children = readInteger(formData, "children");
  if (
    !id ||
    typeof adults !== "number" ||
    typeof children !== "number" ||
    adults > 1000 ||
    children > 1000 ||
    adults + children < 1
  )
    redirect("/admin/logbook?error=checkin");
  const today = manilaToday();
  const { data: booking } = await admin.supabase
    .from("bookings")
    .select("id,status,date_start,date_end")
    .eq("id", id)
    .maybeSingle();
  if (
    !booking ||
    (booking.status !== "confirmed" && booking.status !== "awaiting_payment") ||
    booking.date_start > today ||
    booking.date_end < today
  )
    redirect("/admin/logbook?error=checkin");
  const { data, error } = await admin.supabase
    .from("guest_log")
    .insert({ booking_id: id, actual_adults: adults, actual_children: children, checked_in_by: admin.userId })
    .select("id")
    .single();
  if (error || !data) redirect(`/admin/logbook?error=${error?.code === "23505" ? "alreadyIn" : "checkin"}`);
  await logChange(admin.supabase, admin.userId, "guest_log", data.id, null, {
    booking_id: id,
    actual_adults: adults,
    actual_children: children,
  });
  revalidatePath("/admin", "layout");
  redirect("/admin/logbook?saved=checkin");
}

// Logbook: a guest leaves. When it is the last day of a confirmed stay, the booking is marked completed too.
export async function checkOutAction(formData: FormData) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");
  const id = readText(formData, "log_id", 64);
  if (!id) redirect("/admin/logbook?error=checkin");
  const { data: entry } = await admin.supabase
    .from("guest_log")
    .select("id,booking_id,checked_out_at")
    .eq("id", id)
    .maybeSingle();
  if (!entry || entry.checked_out_at !== null) redirect("/admin/logbook?error=checkin");
  const { error } = await admin.supabase
    .from("guest_log")
    .update({ checked_out_at: new Date().toISOString() })
    .eq("id", id)
    .is("checked_out_at", null);
  if (error) redirect("/admin/logbook?error=checkin");
  await logChange(admin.supabase, admin.userId, "guest_log", id, entry as unknown as Json, { checked_out: true });
  const { data: booking } = await admin.supabase
    .from("bookings")
    .select("id,status,date_end")
    .eq("id", entry.booking_id)
    .maybeSingle();
  if (booking && booking.status === "confirmed" && booking.date_end <= manilaToday()) {
    const update = { status: "completed" as const, hold_expires_at: null };
    const { error: completeError } = await admin.supabase.from("bookings").update(update).eq("id", booking.id);
    if (!completeError)
      await logChange(
        admin.supabase,
        admin.userId,
        "bookings",
        booking.id,
        { status: booking.status },
        update as unknown as Json,
      );
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  redirect("/admin/logbook?saved=checkout");
}
