import { redirect } from "next/navigation";
import { SettingsEditor } from "@/app/admin/_components/settings/settings-editor";
import { requireAdmin } from "@/app/admin/_lib/require-admin";
import { AdminPageFrame } from "@/app/admin/_components/ui/admin-page-frame";

export const metadata = { title: "Resort settings" };

type PageProps = { searchParams: Promise<{ error?: string; saved?: string }> };

export default async function AdminSettingsPage({ searchParams }: PageProps) {
  const admin = await requireAdmin();
  if (admin.role !== "owner") redirect("/admin?error=access");
  const [{ error, saved }, settings] = await Promise.all([
    searchParams,
    admin.supabase.from("settings").select("*").order("key"),
  ]);
  return (
    <AdminPageFrame section="settings" flash={{ error, saved }} loadFailed={Boolean(settings.error)}>
      <SettingsEditor settings={settings.data ?? []} owner />
    </AdminPageFrame>
  );
}
