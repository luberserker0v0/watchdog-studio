import type { EditableNodePath } from "../domain/metadataDraft";

interface Props {
  label: string;
  nodeIds: string[];
  path: EditableNodePath;
  value: unknown;
  onChange: (path: EditableNodePath, value: unknown) => void;
}

export default function ActionTargetField(props: Props) {
  const mode = targetMode(props.value);
  return <fieldset className="action-target-fields"><legend>{props.label}</legend>
    <label>Target source<select value={mode} onChange={(event) => {
      props.onChange(props.path, targetDefault(event.target.value, props.nodeIds));
    }}><option value="current">Recognized box</option><option value="node">Node result</option>
      <option value="point">Point</option><option value="region">Region</option></select></label>
    {mode === "node" && <NodeTarget {...props} />}
    {mode === "point" && <TargetTuple {...props} labels={["x", "y"]} />}
    {mode === "region" && <TargetTuple {...props} labels={["x", "y", "width", "height"]} />}
  </fieldset>;
}

function NodeTarget(props: Props) {
  return <label>Source node<select value={text(props.value)} onChange={(event) => {
    props.onChange(props.path, event.target.value);
  }}><option value="">Select a node…</option>
    {props.nodeIds.map((id) => <option key={id}>{id}</option>)}
  </select></label>;
}

function TargetTuple(props: Props & { labels: string[] }) {
  const values = Array.isArray(props.value) ? props.value : props.labels.map(() => 0);
  return <div className="tuple-fields">{props.labels.map((label, index) => (
    <label key={label}>{label}<input min={index > 1 ? 0 : undefined} type="number"
      value={number(values[index])} onChange={(event) => {
        props.onChange([...props.path, index], Number(event.target.value));
      }} /></label>
  ))}</div>;
}

function targetMode(value: unknown): string {
  if (typeof value === "string") return "node";
  if (Array.isArray(value) && value.length === 2) return "point";
  if (Array.isArray(value) && value.length === 4) return "region";
  return "current";
}

function targetDefault(mode: string, nodeIds: string[]): unknown {
  if (mode === "node") return nodeIds[0] ?? "";
  if (mode === "point") return [0, 0];
  if (mode === "region") return [0, 0, 0, 0];
  return true;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function number(value: unknown): number {
  return typeof value === "number" ? value : 0;
}
