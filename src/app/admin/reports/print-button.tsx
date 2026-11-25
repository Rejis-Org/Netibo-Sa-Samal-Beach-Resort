"use client";

export function PrintButton() {
  return <button type="button" className="button button-outline" onClick={() => window.print()}>Print</button>;
}
