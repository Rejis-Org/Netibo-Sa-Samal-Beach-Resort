"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Desktop: a normal fixed sidebar. Mobile: a top bar with a menu button; the sidebar is a drawer that stays closed until opened.
export function AdminSidebar({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="admin-mobilebar">
        <button
          className="admin-menu-btn"
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="admin-sidebar"
          onClick={() => setOpen(true)}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <span className="admin-brand-mark" aria-hidden="true">
          <Image src="/netibo-admin-mark.png" alt="" width={224} height={152} />
        </span>
        <strong className="admin-mobilebar-title">Netibo sa Samal</strong>
      </div>
      {open && (
        <button className="admin-backdrop" type="button" aria-label="Close menu" onClick={() => setOpen(false)} />
      )}
      <aside
        id="admin-sidebar"
        className={`admin-sidebar${open ? " admin-sidebar-open" : ""}`}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        <button className="admin-drawer-close" type="button" aria-label="Close menu" onClick={() => setOpen(false)}>
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {children}
      </aside>
    </>
  );
}
