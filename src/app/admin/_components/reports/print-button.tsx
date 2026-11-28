"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" className="button button-outline" onClick={() => window.print()}>
      <Printer size={18} aria-hidden="true" />
      Print
    </button>
  );
}
