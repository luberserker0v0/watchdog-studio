import { useMemo, useState } from "react";
import { nodeDefault, type OptionalNodeField } from "../contracts/nodeDefaults";
import type { EditableNodeField, EditableNodeValue } from "../domain/metadataDraft";
import JsonValueField from "./JsonValueField";

interface Props {
  config: Record<string, unknown>;
  nodeName: string;
  onChange: (field: EditableNodeField, value: EditableNodeValue) => void;
}

const FIELDS: FieldDefinition[] = [
  numeric("timeout", "Timeout (ms)", 0), numeric("error_timeout", "Error timeout (ms)", 0),
  numeric("rate_limit", "Rate limit (ms)", 0), numeric("pre_delay", "Pre-delay (ms)", 0),
  freeze("pre_wait_freezes", "Pre-wait freezes"),
  numeric("post_delay", "Post-delay (ms)", 0),
  freeze("post_wait_freezes", "Post-wait freezes"),
  numeric("max_hit", "Max hit", 0), numeric("repeat", "Repeat", 1),
  numeric("repeat_delay", "Repeat delay (ms)", 0),
  { field: "enabled", label: "Enabled", type: "boolean" },
  { field: "inverse", label: "Inverse result", type: "boolean" },
  { field: "kind", label: "Kind", type: "kind" },
];

export default function NodePropertyForm({ config, nodeName, onChange }: Props) {
  const initial = useMemo(() => explicitFields(config), [config]);
  const [visible, setVisible] = useState<OptionalNodeField[]>(initial);
  const available = FIELDS.filter((item) => !visible.includes(item.field));
  const add = (field: OptionalNodeField) => {
    setVisible((current) => [...current, field]);
    onChange(field as EditableNodeField, nodeDefault(field) as EditableNodeValue);
  };
  const remove = (field: OptionalNodeField) => {
    setVisible((current) => current.filter((item) => item !== field));
    onChange(field as EditableNodeField, undefined);
  };
  return <section className="property-form"><h4>Node fields</h4>
    <label>Node Name<input value={text(config.label, nodeName)}
      onChange={(event) => onChange("label", optional(event.target.value))} /></label>
    <label>Description<input value={text(config.desc)}
      onChange={(event) => onChange("desc", event.target.value)} /></label>
    {visible.map((field) => <OptionalField config={config} definition={definition(field)}
      key={field} onChange={onChange} onRemove={() => remove(field)} />)}
    <FieldAdder available={available} onAdd={add} />
  </section>;
}

function OptionalField(props: {
  config: Record<string, unknown>; definition: FieldDefinition;
  onChange: Props["onChange"]; onRemove: () => void;
}) {
  const { field, label, type } = props.definition;
  if (type === "json") return <div className="optional-field json-optional-field">
    <JsonValueField label={label} onChange={(value) => props.onChange(
      field as EditableNodeField, value as EditableNodeValue)} value={props.config[field]} />
    <button aria-label={`Remove ${label}`} onClick={props.onRemove} type="button">−</button>
  </div>;
  return <div className="optional-field"><label>{label}
    {type === "boolean" ? <input checked={boolean(props.config[field], Boolean(nodeDefault(field)))}
      onChange={(event) => props.onChange(field as EditableNodeField, event.target.checked)} type="checkbox" />
      : type === "kind" ? <KindSelect onChange={(value) => props.onChange(field as EditableNodeField, value)}
        value={text(props.config[field], "Normal")} />
      : <input min={props.definition.min} onChange={(event) => props.onChange(field as EditableNodeField,
        Number(event.target.value))} type="number" value={number(props.config[field], field)} />}
  </label><button aria-label={`Remove ${label}`} onClick={props.onRemove} type="button">−</button></div>;
}

function FieldAdder(props: { available: FieldDefinition[]; onAdd: (field: OptionalNodeField) => void }) {
  const [selected, setSelected] = useState(props.available[0]?.field ?? "timeout");
  if (!props.available.length) return null;
  const value = props.available.some((item) => item.field === selected)
    ? selected : props.available[0].field;
  return <div className="field-adder"><select aria-label="Optional node field"
    onChange={(event) => setSelected(event.target.value as OptionalNodeField)} value={value}>
    {props.available.map((item) => <option key={item.field} value={item.field}>{item.label}</option>)}
  </select><button aria-label="Add optional field" onClick={() => props.onAdd(value)}
    type="button">+</button></div>;
}

function KindSelect(props: { value: string; onChange: (value: string) => void }) {
  return <select onChange={(event) => props.onChange(event.target.value)} value={props.value}>
    <option>Normal</option><option>Entry</option><option>Endpoint</option>
  </select>;
}

function explicitFields(config: Record<string, unknown>): OptionalNodeField[] {
  return FIELDS.filter(({ field }) => config[field] !== undefined
    && config[field] !== nodeDefault(field)).map(({ field }) => field);
}
function definition(field: OptionalNodeField): FieldDefinition {
  return FIELDS.find((item) => item.field === field) ?? numeric(field, field, 0);
}
function numeric(field: OptionalNodeField, label: string, min: number): FieldDefinition {
  return { field, label, type: "number", min };
}
function freeze(field: OptionalNodeField, label: string): FieldDefinition {
  return { field, label, type: "json" };
}
function text(value: unknown, fallback = ""): string { return typeof value === "string" ? value : fallback; }
function number(value: unknown, field: OptionalNodeField): number {
  return typeof value === "number" ? value : Number(nodeDefault(field));
}
function boolean(value: unknown, fallback: boolean): boolean { return typeof value === "boolean" ? value : fallback; }
function optional(value: string): string | undefined { return value.trim() ? value : undefined; }

interface FieldDefinition {
  field: OptionalNodeField; label: string; type: "number" | "boolean" | "kind" | "json"; min?: number;
}
