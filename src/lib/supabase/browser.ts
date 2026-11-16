"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";
import type { Database } from "./database.types";

export function createSupabaseBrowserClient() {
  const env = getSupabaseEnv();
  if (!env) return null;
  return createBrowserClient<Database>(env.url, env.key);
}
