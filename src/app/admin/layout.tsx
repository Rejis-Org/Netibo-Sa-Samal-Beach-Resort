import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Resort admin", template: "%s | Netibo sa Samal admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="admin-body">{children}</body>
    </html>
  );
}
