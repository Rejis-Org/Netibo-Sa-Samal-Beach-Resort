export type AdminSectionId = "overview" | "chats" | "bookings" | "blocked-dates" | "units" | "packages" | "settings";
export type AdminGroup = "main" | "guests" | "manage" | "owner";

export type AdminSection = {
  id: AdminSectionId; label: string; eyebrow: string; description: string; group: AdminGroup; ownerOnly?: boolean; icon: string;
};

export const adminSections: AdminSection[] = [
  { id: "overview", label: "Overview", eyebrow: "Dashboard", description: "What needs your attention today.", group: "main", icon: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { id: "chats", label: "Live chats", eyebrow: "Guest support", description: "Reply to website visitors in real time. Open a conversation to mark guest messages as seen.", group: "guests", icon: "M4 5h16v11H9l-5 4V5z" },
  { id: "bookings", label: "Bookings", eyebrow: "Guest requests", description: "Approve a request to start its configured payment deadline. A date is not held while a request is pending.", group: "guests", icon: "M5 4h14v16H5zM8 2v4M16 2v4M5 9h14" },
  { id: "blocked-dates", label: "Closed dates", eyebrow: "Availability", description: "Close a date for maintenance or private use. Guests see it as closed on the calendar and cannot request it.", group: "manage", icon: "M12 3a9 9 0 100 18 9 9 0 000-18zM5.6 5.6l12.8 12.8" },
  { id: "units", label: "Cottages and rooms", eyebrow: "Places to stay", description: "Update a price or turn a listing on or off.", group: "manage", icon: "M3 20V10l9-6 9 6v10M9 20v-6h6v6" },
  { id: "packages", label: "Packages and prices", eyebrow: "Rates", description: "Prices are whole Philippine pesos. Edit names in all three languages.", group: "manage", icon: "M20 12l-8 8-9-9V3h8l9 9zM7.5 7.5h.01" },
  { id: "settings", label: "Resort settings", eyebrow: "Owner only", description: "Optional details can stay blank until confirmed.", group: "owner", ownerOnly: true, icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 00-2-1.2L14.2 3h-4l-.4 2.7a7 7 0 00-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 002 1.2l.4 2.7h4l.4-2.7a7 7 0 002-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" },
];

export function sectionHref(id: AdminSectionId) {
  return id === "overview" ? "/admin" : `/admin/${id}`;
}

export function findSection(id: string | undefined) {
  return adminSections.find((item) => item.id === id);
}
