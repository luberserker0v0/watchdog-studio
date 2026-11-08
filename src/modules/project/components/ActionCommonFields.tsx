import type { EditableNodePath } from "../domain/metadataDraft";
import ActionTargetField from "./ActionTargetField";

interface Props {
  action: Record<string, unknown>;
  basePath: EditableNodePath;
  nodeIds: string[];
  onChange: (path: EditableNodePath, value: unknown) => void;
}

export function TargetActionFields({ action, basePath, nodeIds, onChange }: Props) {
  return <div className="action-type-fields">
    <ActionTargetField label="Target" nodeIds={nodeIds} path={[...basePath, "target"]}
      value={action.target ?? true} onChange={onChange} />
    <OffsetField label="Target offset" path={[...basePath, "target_offset"]}
      value={action.target_offset} onChange={onChange} />
  </div>;
}

export function OffsetField(props: {
  label: string;
  path: EditableNodePath;
  value: unknown;
  onChange: Props["onChange"];
}) {
  const values = tuple(props.value);
  return <fieldset><legend>{props.label}</legend><div className="tuple-fields">
    {["x", "y", "width", "height"].map((label, index) => <label key={label}>{label}
      <input type="number" value={values[index]} onChange={(event) => {
        props.onChange([...props.path, index], Number(event.target.value));
      }} /></label>)}
  </div></fieldset>;
}

export function NumberField(props: {
  label: string;
  path: EditableNodePath;
  value: unknown;
  fallback: number;
  signed?: boolean;
  onChange: Props["onChange"];
}) {
  const value = typeof props.value === "number" ? props.value : props.fallback;
  return <label>{props.label}<input min={props.signed ? undefined : 0} type="number" value={value}
    onChange={(event) => props.onChange(props.path, Number(event.target.value))} /></label>;
}

function tuple(value: unknown): number[] {
  return Array.isArray(value)
    ? [0, 1, 2, 3].map((index) => number(value[index]))
    : [0, 0, 0, 0];
}

function number(value: unknown): number {
  return typeof value === "number" ? value : 0;
}
