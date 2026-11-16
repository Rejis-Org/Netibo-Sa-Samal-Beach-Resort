import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Cancels "awaiting payment" bookings whose payment deadline has passed so their dates open up again.
 * Safe to call often. The public calendar already treats expired holds as free; this keeps the database
 * rows (and the exclusive-date constraint) in step. Replace with a scheduled job later if needed.
 */
export async function expireUnpaidHolds() {
  try {
    const { error } = await createSupabaseServiceClient().rpc("expire_unpaid_holds");
    return !error;
  } catch {
    return false;
  }
}
