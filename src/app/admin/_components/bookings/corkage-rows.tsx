"use client";

import { useState, type ChangeEvent } from "react";
import { MAX_CORKAGE_ROWS } from "@/lib/pricing";
import type { CorkageRowValue } from "./corkage-rows-data";

export type { CorkageRowValue } from "./corkage-rows-data";

type CorkageRowsProps = {
  help: string;
  labelPlaceholder: string;
  rows: CorkageRowValue[];
  /** Controlled mode (manual booking form). Without it the rows manage themselves and the Add button shows. */
  onChange?: (key: number, field: "label" | "amount", value: string) => void;
};

export function CorkageRows({ help, labelPlaceholder, rows: initialRows, onChange }: CorkageRowsProps) {
  const [ownRows, setOwnRows] = useState<CorkageRowValue[]>(initialRows);
  const controlled = Boolean(onChange);
  const rows = controlled ? initialRows : ownRows;

  function fieldProps(row: CorkageRowValue, field: "label" | "amount") {
    if (!onChange) return { defaultValue: row[field] };
    return {
      value: row[field],
      onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(row.key, field, event.target.value),
    };
  }

  function addRow() {
    setOwnRows((current) => {
      if (current.length >= MAX_CORKAGE_ROWS) return current;
      const nextKey = current.reduce((max, row) => Math.max(max, row.key), -1) + 1;
      return [...current, { key: nextKey, label: "", amount: "" }];
    });
  }

  function removeRow(key: number) {
    setOwnRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : current));
  }

  const removable = !controlled && rows.length > 1;

  return (
    <div className="admin-field-wide admin-corkage-rows">
      <p className="admin-help">{help}</p>
      {rows.map((row) => (
        <div className={removable ? "admin-corkage-row admin-corkage-row-removable" : "admin-corkage-row"} key={row.key}>
          <input name="corkage_label" maxLength={80} placeholder={labelPlaceholder} {...fieldProps(row, "label")} />
          <input
            name="corkage_amount"
            type="number"
            min={0}
            step="any"
            placeholder="Fee (PHP)"
            {...fieldProps(row, "amount")}
          />
          {removable && (
            <button
              type="button"
              className="admin-corkage-remove"
              aria-label="Remove this corkage row"
              onClick={() => removeRow(row.key)}
            >
              ×
            </button>
          )}
        </div>
      ))}
      {!controlled && (
        <button
          type="button"
          className="admin-corkage-add"
          onClick={addRow}
          disabled={rows.length >= MAX_CORKAGE_ROWS}
        >
          + Add corkage
        </button>
      )}
    </div>
  );
}
