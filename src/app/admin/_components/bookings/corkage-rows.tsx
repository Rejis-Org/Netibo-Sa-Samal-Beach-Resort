import type { CorkageItem } from "@/lib/pricing";
import type { ChangeEvent } from "react";

export type CorkageRowValue = { key: number; label: string; amount: string };

type CorkageRowsProps = {
  help: string;
  labelPlaceholder: string;
  rows: CorkageRowValue[];
  onChange?: (key: number, field: "label" | "amount", value: string) => void;
};

export function CorkageRows({ help, labelPlaceholder, rows, onChange }: CorkageRowsProps) {
  function fieldProps(row: CorkageRowValue, field: "label" | "amount") {
    if (!onChange) return { defaultValue: row[field] };
    return {
      value: row[field],
      onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(row.key, field, event.target.value),
    };
  }

  return (
    <div className="admin-field-wide admin-corkage-rows">
      <p className="admin-help">{help}</p>
      {rows.map((row) => (
        <div className="admin-corkage-row" key={row.key}>
          <input name="corkage_label" maxLength={80} placeholder={labelPlaceholder} {...fieldProps(row, "label")} />
          <input
            name="corkage_amount"
            type="number"
            min={0}
            step="any"
            placeholder="Fee (PHP)"
            {...fieldProps(row, "amount")}
          />
        </div>
      ))}
    </div>
  );
}

export function corkageRows(items: CorkageItem[]) {
  return [
    ...items.map((item) => ({ label: item.label, amount: String(item.amount) })),
    ...Array.from({ length: 3 }, () => ({ label: "", amount: "" })),
  ].map((row, key) => ({ key, ...row }));
}
