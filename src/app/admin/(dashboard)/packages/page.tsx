import { PackageEditor } from "@/app/admin/_components/catalog/package-editor";
import { requireAdmin } from "@/app/admin/_lib/require-admin";
import { AdminPageFrame } from "@/app/admin/_components/ui/admin-page-frame";

export const metadata = { title: "Packages and prices" };

type PageProps = { searchParams: Promise<{ error?: string; saved?: string }> };

export default async function AdminPackagesPage({ searchParams }: PageProps) {
  const admin = await requireAdmin();
  const [{ error, saved }, packages] = await Promise.all([
    searchParams,
    admin.supabase.from("packages").select("*").order("sort_order"),
  ]);
  return (
    <AdminPageFrame section="packages" flash={{ error, saved }} loadFailed={Boolean(packages.error)}>
      <div className="admin-editor-list">
        {(packages.data ?? []).map((item) => (
          <PackageEditor key={item.id} item={item} />
        ))}
      </div>
    </AdminPageFrame>
  );
}
