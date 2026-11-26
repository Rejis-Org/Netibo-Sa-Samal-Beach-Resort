import { UnitEditor } from "@/app/admin/editor-forms";
import { requireAdmin } from "@/app/admin/require-admin";
import { AdminPageFrame } from "@/app/admin/admin-ui";

export const metadata = { title: "Cottages and rooms" };

type PageProps = { searchParams: Promise<{ error?: string; saved?: string }> };

export default async function AdminUnitsPage({ searchParams }: PageProps) {
  const admin = await requireAdmin();
  const [{ error, saved }, units] = await Promise.all([
    searchParams,
    admin.supabase.from("units").select("*").order("sort_order"),
  ]);
  return (
    <AdminPageFrame section="units" flash={{ error, saved }} loadFailed={Boolean(units.error)}>
      <div className="admin-editor-list">{(units.data ?? []).map((unit) => <UnitEditor key={unit.id} unit={unit} />)}</div>
    </AdminPageFrame>
  );
}
