import { Suspense } from "react";
import Link from "next/link";
import { getAdminContext } from "@/lib/supabase/admin";
import { logoutAction } from "./actions";
import { AdminNav } from "./admin-nav";

function NavIcon({ path }: { path: string }) {
  return <svg className="admin-nav-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>;
}

// Streams in on its own so the page never waits for this count.
async function PendingBadge() {
  const admin = await getAdminContext();
  if (!admin) return null;
  const { count } = await admin.supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending");
  return count ? <b className="admin-nav-badge">{count}</b> : null;
}

type AdminShellProps = { email: string; role: "owner" | "staff"; children: React.ReactNode };

export function AdminShell({ email, role, children }: AdminShellProps) {
  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark" aria-hidden="true">N</span>
          <div><strong>Netibo sa Samal</strong><span>Resort admin</span></div>
        </div>
        <AdminNav role={role} bookingsBadge={<Suspense fallback={null}><PendingBadge /></Suspense>} />
        <div className="admin-sidebar-footer">
          <Link className="admin-nav-link" href="/" target="_blank" rel="noopener noreferrer"><NavIcon path="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5" /><span>View public site</span></Link>
          <div className="admin-account-card">
            <span className="admin-account-email" title={email}>{email}</span>
            <span className="admin-account-role">{role === "owner" ? "Owner" : "Staff"}</span>
            <form action={logoutAction}><button className="admin-signout" type="submit">Sign out</button></form>
          </div>
        </div>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
