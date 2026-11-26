import { redirect } from "next/navigation";
import { SettingsEditor } from "@/app/admin/editor-forms";
import { requireAdmin } from "@/app/admin/require-admin";
import { AdminPageFrame } from "@/app/admin/admin-ui";

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
