export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  min,
  max,
  required,
}: {
  label: string;
  name: string;
  defaultValue: string | number;
  type?: string;
  min?: number;
  max?: number;
  required?: boolean;
}) {
  return (
    <label>
      {label}
      <input name={name} type={type} defaultValue={defaultValue} min={min} max={max} required={required} />
    </label>
  );
}
