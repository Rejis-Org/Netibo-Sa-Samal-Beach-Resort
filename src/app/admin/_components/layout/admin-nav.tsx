"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminSections, sectionHref, type AdminGroup } from "@/app/admin/_lib/admin-sections";
import { NavIcon } from "./nav-icon";

const groupLabels: Record<AdminGroup, string | null> = {
  main: null,
  guests: "Guests",
  manage: "Resort",
  owner: "Owner",
};

export function AdminNav({ role, bookingsBadge }: { role: "owner" | "staff"; bookingsBadge: React.ReactNode }) {
  const pathname = usePathname();
  const visible = adminSections.filter((item) => !item.ownerOnly || role === "owner");
  const groups = (Object.keys(groupLabels) as AdminGroup[])
    .map((group) => ({ group, items: visible.filter((item) => item.group === group) }))
    .filter((entry) => entry.items.length > 0);

  return (
    <nav className="admin-side-nav" aria-label="Admin sections">
      {groups.map(({ group, items }) => (
        <div className="admin-nav-group" key={group}>
          {groupLabels[group] && <p className="admin-nav-label">{groupLabels[group]}</p>}
          {items.map((item) => {
            const href = sectionHref(item.id);
            const active =
              item.id === "overview" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={item.id}
                href={href}
                className={`admin-nav-link${active ? " admin-nav-link-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <NavIcon path={item.icon} />
                <span>{item.label}</span>
                {item.id === "bookings" && bookingsBadge}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
