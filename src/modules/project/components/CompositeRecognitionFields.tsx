import type { GraphNode } from "../contracts/PipelineDocument";
import type { EditableNodePath } from "../domain/metadataDraft";
import JsonValueField from "./JsonValueField";

interface Props {
  recognition: Record<string, unknown>;
  type: string;
  node: GraphNode;
  nodeIds: string[];
  onChange: (path: EditableNodePath, value: unknown) => void;
}

const INLINE_TYPES = ["DirectHit", "TemplateMatch", "OCR", "ColorMatch", "And", "Or", "Custom"];

export default function CompositeRecognitionFields(props: Props) {
  const key = props.type === "And" ? "all_of" : "any_of";
  const param = object(props.recognition.param);
  const operands = array(param?.[key]);
  const path: EditableNodePath = ["recognition", "param", key];
  return <div className="composite-fields">
    <header><strong>{props.type === "And" ? "All operands" : "Any operand"}</strong>
      <button type="button" onClick={() => props.onChange(path, [...operands, ""])}>Add operand</button>
    </header>
    {operands.map((operand, index) => <OperandRow
      {...props} index={index} key={index} operand={operand} operands={operands} path={path}
    />)}
    {!operands.length && <p>Add at least one operand.</p>}
    {props.type === "And" && <BoxIndex recognition={props.recognition} onChange={props.onChange} />}
  </div>;
}

interface OperandProps extends Props {
  index: number;
  operand: unknown;
  operands: unknown[];
  path: EditableNodePath;
}

function OperandRow(props: OperandProps) {
  const inline = object(props.operand);
  const mode = inline ? "inline" : "node";
  return <section className="operand-row">
    <header><span>Operand {props.index + 1}</span><OperandButtons {...props} /></header>
    <label>Source<select value={mode} onChange={(event) => {
      props.onChange([...props.path, props.index], operandDefault(event.target.value));
    }}><option value="node">Pipeline node</option><option value="inline">Inline recognition</option>
    </select></label>
    {inline ? <InlineOperand {...props} inline={inline} /> : <NodeOperand {...props} />}
  </section>;
}

function NodeOperand(props: OperandProps) {
  const choices = props.nodeIds.filter((id) => id !== props.node.id);
  return <label>Node<select value={text(props.operand)} onChange={(event) => {
    props.onChange([...props.path, props.index], event.target.value);
  }}><option value="">Select a node…</option>{choices.map((id) => <option key={id}>{id}</option>)}</select>
  </label>;
}

function InlineOperand(props: OperandProps & { inline: Record<string, unknown> }) {
  const base = [...props.path, props.index];
  return <div className="inline-operand-fields">
    <label>Type<select value={text(props.inline.type, "DirectHit")} onChange={(event) => {
      props.onChange([...base, "type"], event.target.value);
    }}>{INLINE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
    <label>Sub-name<input value={text(props.inline.sub_name)} onChange={(event) => {
      props.onChange([...base, "sub_name"], optional(event.target.value));
    }} /></label>
    <JsonValueField label="Param JSON" value={props.inline.param ?? {}}
      onChange={(value) => props.onChange([...base, "param"], value)} />
  </div>;
}

function OperandButtons(props: OperandProps) {
  return <div className="operand-buttons">
    <button disabled={props.index === 0} type="button" onClick={() => move(props, -1)}>↑</button>
    <button disabled={props.index === props.operands.length - 1} type="button"
      onClick={() => move(props, 1)}>↓</button>
    <button type="button" onClick={() => remove(props)}>Remove</button>
  </div>;
}

function BoxIndex({ recognition, onChange }: Pick<Props, "recognition" | "onChange">) {
  const param = object(recognition.param);
  return <label>Output box operand<input min={0} type="number"
    value={number(param?.box_index, 0)} onChange={(event) => {
      onChange(["recognition", "param", "box_index"], Number(event.target.value));
    }} /></label>;
}

function move(props: OperandProps, offset: number) {
  const next = [...props.operands];
  const target = props.index + offset;
  [next[props.index], next[target]] = [next[target], next[props.index]];
  props.onChange(props.path, next);
}

function remove(props: OperandProps) {
  props.onChange(props.path, props.operands.filter((_, index) => index !== props.index));
}

function operandDefault(mode: string): unknown {
  return mode === "inline" ? { type: "DirectHit", param: {} } : "";
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function optional(value: string): string | undefined {
  return value || undefined;
}
