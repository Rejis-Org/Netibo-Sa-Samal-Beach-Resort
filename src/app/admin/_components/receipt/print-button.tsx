"use client";

export function PrintButton() {
  return (
    <button className="button button-blue" type="button" onClick={() => window.print()}>
      Print or save as PDF
    </button>
  );
}
