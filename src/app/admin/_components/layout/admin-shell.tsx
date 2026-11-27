import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { getAdminContext } from "@/lib/supabase/admin";
import { AccountCard } from "./account-card";
import { AdminNav } from "./admin-nav";
import { AdminSidebar } from "./admin-sidebar";
import { NavIcon } from "./nav-icon";

// Streams in on its own so the page never waits for this count.
async function PendingBadge() {
  const admin = await getAdminContext();
  if (!admin) return null;
  const { count } = await admin.supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return count ? <b className="admin-nav-badge">{count}</b> : null;
}

type AdminShellProps = { email: string; role: "owner" | "staff"; children: React.ReactNode };

export function AdminShell({ email, role, children }: AdminShellProps) {
  return (
    <div className="admin-app">
      <AdminSidebar>
        <div className="admin-brand">
          <span className="admin-brand-mark" aria-hidden="true">
            <Image src="/netibo-admin-mark.png" alt="" width={224} height={152} priority />
          </span>
          <div>
            <strong>Netibo sa Samal</strong>
            <span>Resort admin</span>
          </div>
        </div>
        <AdminNav
          role={role}
          bookingsBadge={
            <Suspense fallback={null}>
              <PendingBadge />
            </Suspense>
          }
        />
        <div className="admin-sidebar-footer">
          <Link className="admin-nav-link" href="/" target="_blank" rel="noopener noreferrer">
            <NavIcon path="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5" />
            <span>View public site</span>
          </Link>
          <AccountCard email={email} role={role} />
        </div>
      </AdminSidebar>
      <div className="admin-main">{children}</div>
    </div>
  );
}
