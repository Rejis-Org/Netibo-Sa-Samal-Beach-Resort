import { UnitEditor } from "@/app/admin/_components/catalog/unit-editor";
import { requireAdmin } from "@/app/admin/_lib/require-admin";
import { AdminPageFrame } from "@/app/admin/_components/ui/admin-page-frame";

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
      <div className="admin-editor-list">
        {(units.data ?? []).map((unit) => (
          <UnitEditor key={unit.id} unit={unit} />
        ))}
      </div>
    </AdminPageFrame>
  );
}
