import { useState } from "react";

interface Props {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
}

export default function JsonValueField({ label, value, onChange }: Props) {
  const formatted = format(value);
  const [error, setError] = useState<string>();
  const commit = (source: string) => {
    try {
      onChange(JSON.parse(source));
      setError(undefined);
    } catch (reason) {
      setError(`Invalid JSON: ${String(reason)}`);
    }
  };
  return <label className="json-value-field">{label}
    <textarea defaultValue={formatted} key={formatted}
      onBlur={(event) => commit(event.currentTarget.value)} />
    {error && <small>{error}</small>}
  </label>;
}

function format(value: unknown): string {
  return JSON.stringify(value ?? null, null, 2);
}
