import { useState } from "react";
import type { GraphEdge, GraphNode, NormalizedGraph } from "../contracts/PipelineDocument";
import { canCreateRoute, sameEdge } from "../domain/graphRoutes";

interface Props {
  graph: NormalizedGraph;
  node: GraphNode;
  selectedEdge?: GraphEdge;
  onAdd: (edge: GraphEdge) => void;
  onRemove: (edge: GraphEdge) => void;
  onReplace: (edge: GraphEdge, replacement: GraphEdge) => void;
}

export default function RouteEditor(props: Props) {
  const routes = props.graph.edges.filter((edge) => edge.from === props.node.id);
  const targets = props.graph.nodes.filter((node) => node.id !== props.node.id);
  const [target, setTarget] = useState(targets[0]?.id ?? "");
  const [kind, setKind] = useState<GraphEdge["kind"]>("Next");
  const errorExists = routes.some((edge) => edge.kind === "Error");
  const pending: GraphEdge = { from: props.node.id, to: target, kind };
  const add = () => {
    if (canCreateRoute(props.graph, pending)) props.onAdd(pending);
  };
  return (
    <section className="route-editor">
      <header><h4>Routes</h4><span>{routes.length} outgoing · drag node ports to connect</span></header>
      {routes.map((edge, index) => <RouteRow
        edge={edge} errorExists={errorExists} key={`${edge.kind}-${edge.to}-${index}`}
        onRemove={props.onRemove} onReplace={props.onReplace} targets={targets}
        selected={sameEdge(edge, props.selectedEdge)}
      />)}
      {props.node.kind === "Endpoint"
        ? <p>Endpoint nodes cannot have outgoing routes.</p>
        : <RouteCreator
          add={add} canAdd={canCreateRoute(props.graph, pending)} errorExists={errorExists}
          kind={kind} setKind={setKind}
          setTarget={setTarget} target={target} targets={targets}
        />}
    </section>
  );
}

function RouteRow(props: {
  edge: GraphEdge;
  errorExists: boolean;
  onRemove: Props["onRemove"];
  onReplace: Props["onReplace"];
  selected: boolean;
  targets: GraphNode[];
}) {
  const replace = (changes: Partial<GraphEdge>) => {
    props.onReplace(props.edge, { ...props.edge, ...changes });
  };
  return <div className={`route-row${props.selected ? " selected" : ""}`}>
    <RouteKindSelect ariaLabel="Route kind" errorDisabled={props.errorExists
      && props.edge.kind !== "Error"} kind={props.edge.kind}
      onChange={(kind) => replace({ kind })} />
    <select aria-label="Route target" onChange={(event) => replace({ to: event.target.value })}
      value={props.edge.to}>
      {props.targets.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}
    </select>
    <button aria-label="Remove route" onClick={() => props.onRemove(props.edge)}
      title="Remove route" type="button">−</button>
  </div>;
}

function RouteCreator(props: {
  add: () => void;
  canAdd: boolean;
  errorExists: boolean;
  kind: GraphEdge["kind"];
  setKind: (value: GraphEdge["kind"]) => void;
  setTarget: (value: string) => void;
  target: string;
  targets: GraphNode[];
}) {
  return <div className="route-row route-creator">
    <RouteKindSelect ariaLabel="New route kind" errorDisabled={props.errorExists}
      kind={props.kind} onChange={props.setKind} />
    <select aria-label="New route target" onChange={(event) => props.setTarget(event.target.value)}
      value={props.target}>
      {props.targets.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}
    </select>
    <button aria-label="Add route" className="route-plus" disabled={!props.canAdd}
      onClick={props.add} title="Add route" type="button">+</button>
  </div>;
}

function RouteKindSelect(props: {
  ariaLabel: string;
  errorDisabled: boolean;
  kind: GraphEdge["kind"];
  onChange: (kind: GraphEdge["kind"]) => void;
}) {
  return <div className="route-kind-field">
    <span aria-hidden="true" className={`route-port-dot ${props.kind.toLowerCase()}`} />
    <select aria-label={props.ariaLabel}
      onChange={(event) => props.onChange(event.target.value as GraphEdge["kind"])}
      value={props.kind}>
      <option value="Next">Next</option>
      <option disabled={props.errorDisabled} value="Error">Error</option>
    </select>
  </div>;
}
