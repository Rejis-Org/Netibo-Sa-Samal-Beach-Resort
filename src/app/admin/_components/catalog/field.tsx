export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  min,
  max,
}: {
  label: string;
  name: string;
  defaultValue: string | number;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label>
      {label}
      <input name={name} type={type} defaultValue={defaultValue} min={min} max={max} />
    </label>
  );
}
