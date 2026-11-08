import { useState } from "react";
import type { GraphEdge, GraphNode, NormalizedGraph } from "../contracts/PipelineDocument";
import type {
  EditableNodeField, EditableNodePath, EditableNodeValue,
} from "../domain/metadataDraft";
import ActionForm from "./ActionForm";
import NodePropertyForm from "./NodePropertyForm";
import RecognitionForm from "./RecognitionForm";
import RouteEditor from "./RouteEditor";

interface Props {
  graph: NormalizedGraph;
  selectedNode: GraphNode;
  selectedEdge?: GraphEdge;
  config: Record<string, unknown>;
  onClose: () => void;
  onChange: (field: EditableNodeField, value: EditableNodeValue) => void;
  onChangePath: (path: EditableNodePath, value: unknown) => void;
  onRouteAdd: (edge: GraphEdge) => void;
  onRouteRemove: (edge: GraphEdge) => void;
  onRouteReplace: (edge: GraphEdge, replacement: GraphEdge) => void;
}

type InspectorTab = "fields" | "recognize" | "actions" | "routes";

export default function NodeInspector(props: Props) {
  const [tab, setTab] = useState<InspectorTab>("fields");
  const nodeIds = props.graph.nodes.map((item) => item.id);
  return <aside className="node-inspector overlay-panel" onPointerDown={(event) => event.stopPropagation()}>
    <InspectorHeader node={props.selectedNode} onClose={props.onClose} />
    <nav className="inspector-tabs">{(["fields", "recognize", "actions", "routes"] as const)
      .map((item) => <button className={tab === item ? "active" : ""} key={item}
        onClick={() => setTab(item)} type="button">{tabLabel(item)}</button>)}</nav>
    <div className="inspector-page">
      {tab === "fields" && <NodePropertyForm config={props.config}
        nodeName={props.selectedNode.label} onChange={props.onChange} />}
      {tab === "recognize" && <RecognitionForm config={props.config} node={props.selectedNode}
        nodeIds={nodeIds} onChange={props.onChangePath} />}
      {tab === "actions" && <ActionForm config={props.config} node={props.selectedNode}
        nodeIds={nodeIds} onChange={props.onChangePath} />}
      {tab === "routes" && <RouteEditor graph={props.graph} node={props.selectedNode}
        onAdd={props.onRouteAdd} onRemove={props.onRouteRemove}
        onReplace={props.onRouteReplace} selectedEdge={props.selectedEdge} />}
    </div>
  </aside>;
}

function InspectorHeader({ node, onClose }: { node: GraphNode; onClose: () => void }) {
  return <header className="inspector-header"><div><span className={`node-kind ${node.kind.toLowerCase()}`}>
    {node.kind}</span><h3>{node.label}</h3></div>
    <button aria-label="Close node inspector" onClick={onClose} type="button">×</button>
    <dl><div><dt>Node ID</dt><dd><code>{node.metadataKey ?? "missing"}</code></dd></div>
      <div><dt>Instance ID</dt><dd><code>{node.id}</code></dd></div></dl>
  </header>;
}

function tabLabel(tab: InspectorTab): string {
  return { fields: "Fields", recognize: "Recognize", actions: "Actions", routes: "Routes" }[tab];
}
