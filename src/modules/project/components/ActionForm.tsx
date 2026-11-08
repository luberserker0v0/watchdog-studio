import type { GraphNode } from "../contracts/PipelineDocument";
import type { EditableNodePath } from "../domain/metadataDraft";
import ActionTypeFields from "./ActionTypeFields";

interface Props {
  config: Record<string, unknown>;
  node: GraphNode;
  nodeIds: string[];
  onChange: (path: EditableNodePath, value: unknown) => void;
}

const ACTION_TYPES = [
  "DoNothing", "Wait", "Click", "LongPress", "Swipe",
  "Scroll", "ClickKey", "InputText", "StopTask", "Custom",
];

export default function ActionForm(props: Props) {
  const kind = text(props.config.kind, props.node.kind);
  if (["Entry", "Endpoint"].includes(kind)) return <UnavailableActions />;
  const actions = array(props.config.actions);
  return <section className="action-form"><header><h4>Actions</h4>
    <button type="button" onClick={() => props.onChange(["actions"], [
      ...actions, defaultAction("DoNothing"),
    ])}>Add action</button></header>
    {actions.length === 0 && <p className="form-note">No actions. The node only recognizes and routes.</p>}
    {actions.map((action, index) => <ActionRow {...props} action={object(action)}
      actions={actions} index={index} key={index} />)}
  </section>;
}

function UnavailableActions() {
  return <section className="action-form"><h4>Actions</h4>
    <p>Entry and Endpoint nodes do not support actions.</p></section>;
}

function ActionRow(props: Props & {
  action: Record<string, unknown>;
  actions: unknown[];
  index: number;
}) {
  const basePath = ["actions", props.index] as const;
  return <article className="action-row"><header><strong>Action {props.index + 1}</strong>
    <ActionButtons {...props} /></header>
    <label>Type<select value={text(props.action.type, "DoNothing")} onChange={(event) => {
      props.onChange(basePath, defaultAction(event.target.value));
    }}>{ACTION_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
    <ActionTypeFields action={props.action} basePath={basePath}
      nodeIds={props.nodeIds} onChange={props.onChange} />
  </article>;
}

function ActionButtons(props: Props & { actions: unknown[]; index: number }) {
  return <div className="action-buttons">
    <button disabled={props.index === 0} type="button" onClick={() => move(props, -1)}>↑</button>
    <button disabled={props.index === props.actions.length - 1} type="button"
      onClick={() => move(props, 1)}>↓</button>
    <button type="button" onClick={() => props.onChange(
      ["actions"], props.actions.filter((_, index) => index !== props.index),
    )}>Remove</button>
  </div>;
}

function move(props: Props & { actions: unknown[]; index: number }, offset: number) {
  const next = [...props.actions];
  const destination = props.index + offset;
  [next[props.index], next[destination]] = [next[destination], next[props.index]];
  props.onChange(["actions"], next);
}

function defaultAction(type: string): Record<string, unknown> {
  if (type === "Wait") return { type, duration: 0 };
  if (type === "Click") return { type, target: true, target_offset: [0, 0, 0, 0] };
  if (type === "LongPress") return { type, target: true, duration: 1000 };
  if (type === "Swipe") return { type, begin: true, end: true, duration: 200 };
  if (type === "Scroll") return { type, target: true, dx: 0, dy: 0 };
  if (type === "ClickKey") return { type, key: [0] };
  if (type === "InputText") return { type, input_text: "" };
  if (type === "Custom") return { type, action: "", param: null };
  return { type };
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : { type: "DoNothing" };
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}
