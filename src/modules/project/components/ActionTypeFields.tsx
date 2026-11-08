import type { EditableNodePath } from "../domain/metadataDraft";
import { NumberField, OffsetField, TargetActionFields } from "./ActionCommonFields";
import ActionTargetField from "./ActionTargetField";
import JsonValueField from "./JsonValueField";
import KeySequenceField from "./KeySequenceField";

interface Props {
  action: Record<string, unknown>;
  basePath: EditableNodePath;
  nodeIds: string[];
  onChange: (path: EditableNodePath, value: unknown) => void;
}

export default function ActionTypeFields(props: Props) {
  const type = text(props.action.type, "DoNothing");
  if (type === "Wait") return <Duration {...props} fallback={0} label="Wait duration (ms)" />;
  if (type === "Click") return <TargetActionFields {...props} />;
  if (type === "LongPress") return <LongPressFields {...props} />;
  if (type === "Swipe") return <SwipeFields {...props} />;
  if (type === "Scroll") return <ScrollFields {...props} />;
  if (type === "ClickKey") return <KeySequenceField keys={props.action.key}
    path={[...props.basePath, "key"]} onChange={props.onChange} />;
  if (type === "InputText") return <TextField {...props} />;
  if (type === "Custom") return <CustomFields {...props} />;
  return <p className="form-note">This action has no additional fields.</p>;
}

function LongPressFields(props: Props) {
  return <div className="action-type-fields"><TargetActionFields {...props} />
    <Duration {...props} fallback={1000} label="Hold duration (ms)" /></div>;
}

function SwipeFields(props: Props) {
  const { action, basePath, nodeIds, onChange } = props;
  return <div className="action-type-fields">
    <ActionTargetField label="Begin" nodeIds={nodeIds} path={[...basePath, "begin"]}
      value={action.begin ?? true} onChange={onChange} />
    <OffsetField label="Begin offset" path={[...basePath, "begin_offset"]}
      value={action.begin_offset} onChange={onChange} />
    <ActionTargetField label="End" nodeIds={nodeIds} path={[...basePath, "end"]}
      value={action.end ?? true} onChange={onChange} />
    <OffsetField label="End offset" path={[...basePath, "end_offset"]}
      value={action.end_offset} onChange={onChange} />
    <Duration {...props} fallback={200} label="Swipe duration (ms)" />
  </div>;
}

function ScrollFields(props: Props) {
  return <div className="action-type-fields"><TargetActionFields {...props} />
    <div className="numeric-fields"><NumberField label="Horizontal delta (dx)" signed fallback={0}
      path={[...props.basePath, "dx"]} value={props.action.dx} onChange={props.onChange} />
    <NumberField label="Vertical delta (dy)" signed fallback={0}
      path={[...props.basePath, "dy"]} value={props.action.dy} onChange={props.onChange} /></div>
  </div>;
}

function Duration(props: Props & { fallback: number; label: string }) {
  return <NumberField label={props.label} fallback={props.fallback}
    path={[...props.basePath, "duration"]} value={props.action.duration} onChange={props.onChange} />;
}

function TextField(props: Props) {
  return <label>Text<input value={text(props.action.input_text)} onChange={(event) => {
    props.onChange([...props.basePath, "input_text"], event.target.value);
  }} /></label>;
}

function CustomFields(props: Props) {
  return <div className="action-type-fields"><label>Registered action<input required
    value={text(props.action.action)} onChange={(event) => {
      props.onChange([...props.basePath, "action"], event.target.value);
    }} /></label><JsonValueField label="Action parameter" value={props.action.param ?? null}
      onChange={(value) => props.onChange([...props.basePath, "param"], value)} /></div>;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}
