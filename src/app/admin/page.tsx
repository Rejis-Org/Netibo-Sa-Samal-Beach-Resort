import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAdminContext } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { logoutAction } from "./actions";
import { PackageEditor, SettingsEditor, UnitEditor } from "./editor-forms";

type AdminPageProps = { searchParams: Promise<{ error?: string; saved?: string }> };

const errorMessages: Record<string, string> = {
  unit: "Please check the unit fields and try saving again.",
  package: "Please check the package fields and try saving again.",
  settings: "Please check the setting value and try saving again.",
  access: "Only the owner account can change resort settings.",
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await cookies();
  const configured = Boolean(getSupabaseEnv());
  if (!configured) {
    return (
      <main className="admin-shell">
        <section className="admin-setup-card">
          <p className="eyebrow">Netibo sa Samal</p>
          <h1>Connect the resort database</h1>
          <p>Add the Supabase project URL and publishable key to `.env.local`, then run `supabase/schema.sql` once in the Supabase SQL Editor.</p>
          <Link className="button button-blue" href="/admin/login">Open sign in</Link>
        </section>
      </main>
    );
  }

  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?error=access");

  const [{ data: units, error: unitsError }, { data: packages, error: packagesError }] = await Promise.all([
    admin.supabase.from("units").select("*").order("sort_order"),
    admin.supabase.from("packages").select("*").order("sort_order"),
  ]);
  const { data: settings, error: settingsError } = admin.role === "owner"
    ? await admin.supabase.from("settings").select("*").order("key")
    : { data: [], error: null };
  const { error, saved } = await searchParams;
  const loadFailed = unitsError || packagesError || settingsError;

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div><p className="eyebrow">Netibo sa Samal</p><h1>Resort admin</h1></div>
        <div className="admin-account"><span>{admin.email} · {admin.role}</span><form action={logoutAction}><button className="admin-text-button" type="submit">Sign out</button></form></div>
      </header>
      <nav className="admin-nav" aria-label="Admin sections">
        <a href="#units">Cottages and rooms</a><a href="#packages">Packages and prices</a>{admin.role === "owner" && <a href="#settings">Resort settings</a>}
        <Link href="/">View public site ↗</Link>
      </nav>
      <section className="admin-summary-grid" aria-label="Catalog summary">
        <article><span>Units</span><strong>{units?.length ?? 0}</strong></article>
        <article><span>Packages and fees</span><strong>{packages?.length ?? 0}</strong></article>
        <article><span>Signed in as</span><strong className="admin-summary-role">{admin.role === "owner" ? "Owner" : "Staff"}</strong></article>
      </section>
      {saved && <p className="admin-message admin-message-success">Changes saved. The public pages now show the latest catalog.</p>}
      {error && <p className="admin-message admin-message-error">{errorMessages[error] ?? "Something went wrong. Try again or check the database connection."}</p>}
      {loadFailed && <p className="admin-message admin-message-error">Could not load resort data. Confirm that `supabase/schema.sql` has been run in this project.</p>}

      <section id="units" className="admin-section">
        <div className="admin-section-heading"><div><p className="eyebrow">Places to stay</p><h2>Cottages and rooms</h2></div><p>Update a price or turn a listing on or off.</p></div>
        <div className="admin-editor-list">{(units ?? []).map((unit) => <UnitEditor key={unit.id} unit={unit} />)}</div>
      </section>
      <section id="packages" className="admin-section">
        <div className="admin-section-heading"><div><p className="eyebrow">Rates</p><h2>Packages and prices</h2></div><p>Prices are whole Philippine pesos. Edit names in all three languages.</p></div>
        <div className="admin-editor-list">{(packages ?? []).map((item) => <PackageEditor key={item.id} item={item} />)}</div>
      </section>
      {admin.role === "owner" && <section id="settings" className="admin-section">
        <div className="admin-section-heading"><div><p className="eyebrow">Owner only</p><h2>Resort settings</h2></div><p>Optional details can stay blank until confirmed.</p></div>
        <SettingsEditor settings={settings ?? []} owner />
      </section>}
      <footer className="admin-footer"><Link href="/">Back to the public website</Link></footer>
    </main>
  );
}
