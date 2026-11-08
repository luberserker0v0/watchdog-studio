import type { GraphNode } from "../contracts/PipelineDocument";
import type { EditableNodePath } from "../domain/metadataDraft";
import CompositeRecognitionFields from "./CompositeRecognitionFields";
import CustomRecognitionFields from "./CustomRecognitionFields";

interface Props {
  config: Record<string, unknown>;
  node: GraphNode;
  nodeIds: string[];
  onChange: (path: EditableNodePath, value: unknown) => void;
}

const PRIMITIVE_TYPES = ["DirectHit", "TemplateMatch", "OCR", "ColorMatch"];
const RECOGNITION_TYPES = [...PRIMITIVE_TYPES, "And", "Or", "Custom"];

export default function RecognitionForm(props: Props) {
  if (["Entry", "Endpoint"].includes(text(props.config.kind, props.node.kind))) {
    return <section className="recognition-form"><h4>Recognition</h4>
      <p>Entry and Endpoint nodes do not support recognition.</p></section>;
  }
  const recognition = object(props.config.recognition) ?? { type: "DirectHit" };
  const type = text(recognition.type, "DirectHit");
  return (
    <section className="recognition-form">
      <h4>Recognition</h4>
      <TypeField type={type} onChange={props.onChange} />
      <TypeFields {...props} recognition={recognition} type={type} />
      <RoiField {...props} recognition={recognition} />
    </section>
  );
}

function TypeField({ type, onChange }: { type: string; onChange: Props["onChange"] }) {
  return <label>Type<select value={type} onChange={(event) => {
    onChange(["recognition"], defaultRecognition(event.target.value));
  }}>
    {RECOGNITION_TYPES.map((value) => <option key={value}>{value}</option>)}
  </select></label>;
}

function TypeFields(props: {
  recognition: Record<string, unknown>;
  type: string;
  onChange: Props["onChange"];
  node: GraphNode;
  nodeIds: string[];
}) {
  if (props.type === "TemplateMatch") return <TemplateFields {...props} />;
  if (props.type === "OCR") return <OcrFields {...props} />;
  if (props.type === "ColorMatch") return <ColorFields {...props} />;
  if (["And", "Or"].includes(props.type)) return <CompositeRecognitionFields {...props} />;
  if (props.type === "Custom") return <CustomRecognitionFields {...props} />;
  return null;
}

function TemplateFields({ recognition, onChange }: Parameters<typeof TypeFields>[0]) {
  return <div className="recognition-fields">
    <label>Template<input required value={text(recognition.template)} onChange={(event) => {
      onChange(["recognition", "template"], event.target.value);
    }} /></label>
    <ThresholdField defaultValue={0.7} recognition={recognition} onChange={onChange} />
  </div>;
}

function OcrFields({ recognition, onChange }: Parameters<typeof TypeFields>[0]) {
  return <div className="recognition-fields">
    <label>Expected regex, one per line<textarea value={expectedText(recognition.expected)}
      onChange={(event) => onChange(
        ["recognition", "expected"], expectedValue(event.target.value),
      )} /></label>
    <ThresholdField defaultValue={0.3} recognition={recognition} onChange={onChange} />
  </div>;
}

function ThresholdField(props: {
  defaultValue: number;
  recognition: Record<string, unknown>;
  onChange: Props["onChange"];
}) {
  return <label>Threshold<input max={1} min={0} step={0.01} type="number"
    value={number(props.recognition.threshold, props.defaultValue)}
    onChange={(event) => props.onChange(["recognition", "threshold"], Number(event.target.value))}
  /></label>;
}

function ColorFields({ recognition, onChange }: Parameters<typeof TypeFields>[0]) {
  return <div className="recognition-fields">
    <RgbField label="Lower RGB" path="lower" value={recognition.lower} onChange={onChange} />
    <RgbField label="Upper RGB" path="upper" value={recognition.upper} onChange={onChange} />
  </div>;
}

function RgbField(props: {
  label: string;
  path: string;
  value: unknown;
  onChange: Props["onChange"];
}) {
  const values = tuple(props.value, props.path === "upper" ? 255 : 0);
  return <fieldset><legend>{props.label}</legend><div className="tuple-fields">
    {values.slice(0, 3).map((value, index) => <input aria-label={`${props.label} ${index}`}
      key={index} max={255} min={0} type="number" value={value}
      onChange={(event) => props.onChange(
        ["recognition", props.path, index], Number(event.target.value),
      )}
    />)}
  </div></fieldset>;
}

function RoiField(props: Props & { recognition: Record<string, unknown> }) {
  const mode = roiMode(props.recognition.roi);
  return <fieldset className="roi-fields"><legend>Recognition area</legend>
    <label>ROI source<select value={mode} onChange={(event) => {
      props.onChange(["recognition", "roi"], roiDefault(event.target.value, props.nodeIds));
    }}><option value="full">Full frame</option><option value="region">Coordinates</option>
      <option value="node">Earlier node</option></select></label>
    {mode === "region" && <RegionInputs value={props.recognition.roi} onChange={props.onChange} />}
    {mode === "node" && <NodeReference {...props} />}
  </fieldset>;
}

function RegionInputs({ value, onChange }: { value: unknown; onChange: Props["onChange"] }) {
  const values = tuple(value, 0);
  return <div className="tuple-fields">{["x", "y", "width", "height"].map((label, index) => (
    <label key={label}>{label}<input min={index > 1 ? 0 : undefined} type="number"
      value={values[index]} onChange={(event) => {
        onChange(["recognition", "roi", index], Number(event.target.value));
      }} /></label>
  ))}</div>;
}

function NodeReference(props: Props & { recognition: Record<string, unknown> }) {
  const choices = props.nodeIds.filter((id) => id !== props.node.id);
  return <label>Source node<select value={text(props.recognition.roi)} onChange={(event) => {
    props.onChange(["recognition", "roi"], event.target.value);
  }}><option value="">Select an earlier node…</option>
    {choices.map((id) => <option key={id}>{id}</option>)}
  </select></label>;
}

function defaultRecognition(type: string): Record<string, unknown> {
  if (type === "TemplateMatch") return { type, template: "", threshold: 0.7 };
  if (type === "OCR") return { type, threshold: 0.3 };
  if (type === "ColorMatch") return { type, lower: [0, 0, 0], upper: [255, 255, 255] };
  if (type === "And") return { type, param: { all_of: [""] } };
  if (type === "Or") return { type, param: { any_of: [""] } };
  if (type === "Custom") {
    return { type, param: { custom_recognition: "", custom_recognition_param: null } };
  }
  return { type };
}

function roiMode(value: unknown): string {
  if (Array.isArray(value)) return "region";
  if (typeof value === "string") return "node";
  return "full";
}

function roiDefault(mode: string, nodeIds: string[]): unknown {
  if (mode === "region") return [0, 0, 0, 0];
  if (mode === "node") return nodeIds[0] ?? "";
  return undefined;
}

function tuple(value: unknown, fallback: number): number[] {
  return Array.isArray(value) ? value.map((item) => number(item, fallback)) : [fallback, fallback, fallback, fallback];
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function expectedText(value: unknown): string {
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string").join("\n");
  return text(value);
}

function expectedValue(value: string): string | string[] | undefined {
  const patterns = value.split(/\r?\n/).filter((pattern) => pattern.length > 0);
  if (patterns.length === 0) return undefined;
  return patterns.length === 1 ? patterns[0] : patterns;
}
