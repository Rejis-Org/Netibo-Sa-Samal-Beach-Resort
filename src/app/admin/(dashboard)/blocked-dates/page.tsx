import { BlockedDatesPanel } from "@/app/admin/editor-forms";
import { requireAdmin } from "@/app/admin/require-admin";
import { AdminPageFrame } from "@/app/admin/admin-ui";
import { manilaToday } from "@/lib/booking-data";

export const metadata = { title: "Closed dates" };

type PageProps = { searchParams: Promise<{ error?: string; saved?: string }> };

export default async function AdminBlockedDatesPage({ searchParams }: PageProps) {
  const admin = await requireAdmin();
  const [{ error, saved }, blocked] = await Promise.all([
    searchParams,
    admin.supabase.from("blocked_dates").select("*").gte("date", manilaToday()).order("date"),
  ]);
  return (
    <AdminPageFrame section="blocked-dates" flash={{ error, saved }} loadFailed={Boolean(blocked.error)}>
      <BlockedDatesPanel dates={blocked.data ?? []} />
    </AdminPageFrame>
  );
}
