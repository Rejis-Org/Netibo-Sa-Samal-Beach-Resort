import Link from "next/link";
import { sectionHref } from "@/app/admin/_lib/admin-sections";

export function QuickActions() {
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <h2>Quick actions</h2>
      </div>
      <div className="admin-quick-actions">
        <Link href={sectionHref("chats")}>Open live chats</Link>
        <Link href={sectionHref("bookings")}>Add a manual booking</Link>
        <Link href={sectionHref("blocked-dates")}>Close a date</Link>
        <Link href={sectionHref("packages")}>Edit packages and prices</Link>
      </div>
    </section>
  );
}
