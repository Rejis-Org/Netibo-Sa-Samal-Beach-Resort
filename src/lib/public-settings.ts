import { RESORT_PHONE } from "@/lib/site";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export async function getResortPhone() {
  const supabase = createSupabasePublicClient();
  if (!supabase) return RESORT_PHONE;
  try {
    const { data, error } = await supabase.from("settings").select("value").eq("key", "contact_phone").maybeSingle();
    if (error || typeof data?.value !== "string" || data.value.trim().length < 7) return RESORT_PHONE;
    return data.value;
  } catch {
    return RESORT_PHONE;
  }
}
