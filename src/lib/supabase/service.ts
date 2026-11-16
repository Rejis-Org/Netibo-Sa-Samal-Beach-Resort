import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv, getSupabaseSecretKey } from "./env";
import type { Database } from "./database.types";

export function createSupabaseServiceClient() {
  const env = getSupabaseEnv();
  const secret = getSupabaseSecretKey();
  if (!env || !secret) throw new Error("Supabase server credentials are missing from .env.local.");

  return createClient<Database>(env.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
