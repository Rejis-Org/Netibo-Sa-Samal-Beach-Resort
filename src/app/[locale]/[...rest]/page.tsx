import { notFound } from "next/navigation";

// Unknown URLs under a locale land here so they render [locale]/not-found.tsx with a real 404 status.
export default function CatchAllPage() {
  notFound();
}
