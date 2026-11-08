import { useId, useMemo, useState, type PointerEvent } from "react";
import {
  liveNodePositions, useCanvasGesture, type CanvasGesture,
} from "../application/useCanvasGesture";
import type { NodeTemplateDrag } from "../application/useNodeTemplateDrag";
import type {
  GraphEdge, GraphEdgeKind, GraphNode, NormalizedGraph,
} from "../contracts/PipelineDocument";
import type { NodeTemplate } from "../contracts/NodeTemplate";
import { canvasSize, edgePath, previewPath } from "../domain/graphGeometry";
import {
  inputPortPosition, NODE_HEIGHT, NODE_WIDTH, portPosition, resolveNodePositions,
  snapPosition, type NodePosition, type NodePositions,
} from "../domain/layoutDraft";

interface Props {
  graph?: NormalizedGraph;
  layoutSource?: string;
  selectedNodeIds: string[];
  selectedEdges: GraphEdge[];
  onSelectNode: (nodeId: string, additive?: boolean) => void;
  onSelectNodes: (nodeIds: string[], edges?: GraphEdge[]) => void;
  onSelectEdge: (edge: GraphEdge, additive?: boolean) => void;
  onConnectEdge: (edge: GraphEdge) => void;
  onReplaceEdge: (edge: GraphEdge, replacement: GraphEdge) => void;
  onDropNode: (template: NodeTemplate, position: NodePosition) => void;
  nodeDrag?: NodeTemplateDrag;
  onMoveNodes: (positions: NodePositions) => void;
  onBackground: () => void;
}

export default function GraphCanvas(props: Props) {
  const [grid, setGrid] = useState(true);
  if (!props.graph) return <EmptyCanvas />;
  return <PopulatedCanvas {...props} graph={props.graph} grid={grid} onGrid={setGrid} />;
}

interface PopulatedProps extends Props {
  graph: NormalizedGraph;
  grid: boolean;
  onGrid: (enabled: boolean) => void;
}

function PopulatedCanvas(props: PopulatedProps) {
  const scrollId = useId().replace(/:/g, "");
  const base = useMemo(() => resolveNodePositions(props.graph, props.layoutSource),
    [props.graph, props.layoutSource]);
  const pan = (delta: NodePosition) => {
    const scroll = document.getElementById(scrollId);
    if (!scroll) return;
    scroll.scrollLeft -= delta.x; scroll.scrollTop -= delta.y;
  };
  const gesture = useCanvasGesture({
    positions: base, edges: props.graph.edges, selectedNodeIds: props.selectedNodeIds,
    snap: props.grid, onMoveNodes: props.onMoveNodes, onConnectEdge: props.onConnectEdge,
    onReplaceEdge: props.onReplaceEdge, onSelectNode: props.onSelectNode,
    onSelectNodes: props.onSelectNodes, onPan: pan,
  });
  const positions = livePositions(base, gesture.gesture, props.grid);
  return <CanvasFrame {...props} positions={positions} gesture={gesture} scrollId={scrollId} />;
}

type GestureApi = ReturnType<typeof useCanvasGesture>;
interface FrameProps extends PopulatedProps {
  positions: NodePositions;
  gesture: GestureApi;
  scrollId: string;
}

function CanvasFrame(props: FrameProps) {
  const size = canvasSize(props.positions);
  const prefix = useId().replace(/:/g, "");
  const [dropPreview, setDropPreview] = useState<NodeDropPreview>();
  const background = (event: PointerEvent<SVGRectElement>) => {
    props.onBackground(); props.gesture.beginBackground(event);
  };
  return <section className="graph-canvas">
    <CanvasHeader enabled={props.grid} onChange={props.onGrid} />
    <div className="pipeline-canvas-scroll" id={props.scrollId}>
      <svg className="pipeline-canvas" height={Math.max(size.height, 1400)}
        viewBox={`0 0 ${Math.max(size.width, 2400)} ${Math.max(size.height, 1400)}`}
        width={Math.max(size.width, 2400)}
        onPointerMove={(event) => movePointer(event, props, setDropPreview)}
        onPointerUp={(event) => finishPointer(event, props, setDropPreview)}
        onPointerCancel={() => { props.gesture.cancel(); setDropPreview(undefined); }}
        onPointerLeave={() => setDropPreview(undefined)}
        aria-label="Pipeline graph" tabIndex={0}>
        <CanvasDefinitions prefix={prefix} />
        <rect className="canvas-background" width="100%" height="100%" onPointerDown={background}
          fill={props.grid ? `url(#${prefix}-grid)` : "#f8fafc"} />
        <CanvasEdges {...props} markerPrefix={prefix} />
        <CanvasNodes {...props} />
        {dropPreview && <NodeDropGhost preview={dropPreview} />}
        <SelectedEdgeHandles {...props} />
        <GestureOverlay positions={props.positions} gesture={props.gesture.gesture} />
      </svg>
    </div>
  </section>;
}

function CanvasHeader(props: { enabled: boolean; onChange: (enabled: boolean) => void }) {
  return <header><div><strong>Graph routes</strong>
    <span>Drag blank space to pan · Shift-drag to select · Ctrl-click to add selection</span></div>
    <label className="canvas-grid-toggle"><input checked={props.enabled}
      onChange={(event) => props.onChange(event.target.checked)} type="checkbox" />Grid · 20 px</label></header>;
}

function CanvasDefinitions({ prefix }: { prefix: string }) {
  return <defs><pattern id={`${prefix}-grid`} width="20" height="20" patternUnits="userSpaceOnUse">
    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#dbe3ef" strokeWidth="1" />
  </pattern>{(["next", "error"] as const).map((kind) =>
    <marker className={kind} id={`${prefix}-${kind}-arrow`} key={kind} markerHeight="8"
      markerWidth="8" orient="auto" refX="7" refY="4"><path d="M0,0 L8,4 L0,8 z" /></marker>)}</defs>;
}

function CanvasEdges(props: FrameProps & { markerPrefix: string }) {
  return <g className="canvas-edges">{props.graph.edges.map((edge, index) => {
    const path = routePath(edge, props.positions);
    if (!path) return null;
    const selected = props.selectedEdges.some((item) => sameEdge(edge, item));
    return <g key={`${edge.from}-${edge.kind}-${edge.to}-${index}`}>
      <path className={`canvas-edge ${edge.kind.toLowerCase()}${selected ? " selected" : ""}`}
        d={path} markerEnd={`url(#${props.markerPrefix}-${edge.kind.toLowerCase()}-arrow)`} />
      <path className="canvas-edge-hit" d={path} onPointerDown={(event) => {
        event.stopPropagation(); focusCanvas(event);
        props.onSelectEdge(edge, event.ctrlKey || event.metaKey);
      }} />
    </g>;
  })}</g>;
}

function SelectedEdgeHandles(props: FrameProps) {
  return <g>{props.selectedEdges.map((edge) => <EdgeHandles edge={edge}
    gesture={props.gesture} key={`${edge.from}-${edge.kind}-${edge.to}`}
    positions={props.positions} />)}</g>;
}

function CanvasNodes(props: FrameProps) {
  return <g className="canvas-nodes">{props.graph.nodes.map((node) =>
    <CanvasNode gesture={props.gesture} key={node.id} node={node}
      position={props.positions[node.id]} selected={props.selectedNodeIds.includes(node.id)} />)}</g>;
}

function CanvasNode(props: { node: GraphNode; position: NodePosition; selected: boolean; gesture: GestureApi }) {
  const kind = props.node.kind.toLowerCase();
  return <g className={`canvas-node ${kind}${props.selected ? " selected" : ""}`}
    transform={`translate(${props.position.x} ${props.position.y})`}
    onPointerDown={(event) => props.gesture.beginNode(props.node.id, event)}>
    <rect width="160" height="64" rx="9" />
    <circle className="canvas-port input" cx="0" cy={NODE_HEIGHT / 2} r="8" />
    <title>{props.node.label}</title>
    <text x="80" y="33" textAnchor="middle" dominantBaseline="middle">
      {displayNodeName(props.node.label)}</text>
    {kind !== "endpoint" && <NodePorts nodeId={props.node.id} gesture={props.gesture} />}
  </g>;
}

function NodePorts({ nodeId, gesture }: { nodeId: string; gesture: GestureApi }) {
  return <>{(["Next", "Error"] as GraphEdgeKind[]).map((kind) => {
    const point = portPosition({ x: 0, y: 0 }, kind);
    return <circle className={`canvas-port ${kind.toLowerCase()}`} cx={point.x} cy={point.y}
      key={kind} onPointerDown={(event) => gesture.beginRoute(nodeId, kind, event)} r="8" />;
  })}</>;
}

function GestureOverlay(props: { positions: NodePositions; gesture?: CanvasGesture }) {
  if (props.gesture?.type === "route") {
    const source = props.positions[props.gesture.sourceId];
    if (!source) return null;
    return <path className={`canvas-route-preview ${props.gesture.kind.toLowerCase()}`}
      d={previewPath(portPosition(source, props.gesture.kind), props.gesture.point)} />;
  }
  if (props.gesture?.type === "edge-adjust") {
    return <EdgeAdjustPreview gesture={props.gesture} positions={props.positions} />;
  }
  if (props.gesture?.type === "marquee") return <Marquee gesture={props.gesture} />;
  return null;
}

function EdgeHandles(props: { edge: GraphEdge; gesture: GestureApi; positions: NodePositions }) {
  const source = props.positions[props.edge.from]; const target = props.positions[props.edge.to];
  if (!source || !target) return null;
  const start = portPosition(source, props.edge.kind); const end = inputPortPosition(target);
  return <g className="edge-adjust-handles">
    <circle className={`edge-adjust-handle ${props.edge.kind.toLowerCase()}`} cx={start.x} cy={start.y}
      onPointerDown={(event) => props.gesture.beginEdgeAdjust(props.edge, "source", event)} r="7" />
    <circle className={`edge-adjust-handle ${props.edge.kind.toLowerCase()}`} cx={end.x} cy={end.y}
      onPointerDown={(event) => props.gesture.beginEdgeAdjust(props.edge, "target", event)} r="7" />
  </g>;
}

function EdgeAdjustPreview(props: {
  gesture: Extract<CanvasGesture, { type: "edge-adjust" }>; positions: NodePositions;
}) {
  const source = props.positions[props.gesture.edge.from];
  const target = props.positions[props.gesture.edge.to];
  if (!source || !target) return null;
  const fixed = props.gesture.endpoint === "target"
    ? portPosition(source, props.gesture.edge.kind) : inputPortPosition(target);
  const path = props.gesture.endpoint === "target"
    ? previewPath(fixed, props.gesture.point) : previewPath(props.gesture.point, fixed);
  return <path className={`canvas-route-preview ${props.gesture.edge.kind.toLowerCase()}`} d={path} />;
}

function Marquee({ gesture }: { gesture: Extract<CanvasGesture, { type: "marquee" }> }) {
  const x = Math.min(gesture.start.x, gesture.point.x); const y = Math.min(gesture.start.y, gesture.point.y);
  return <rect className="canvas-marquee" height={Math.abs(gesture.point.y - gesture.start.y)}
    width={Math.abs(gesture.point.x - gesture.start.x)} x={x} y={y} />;
}

function livePositions(base: NodePositions, gesture: CanvasGesture | undefined, snap: boolean) {
  return gesture?.type === "node" ? { ...base, ...liveNodePositions(gesture, snap) } : base;
}
function routePath(edge: GraphEdge, positions: NodePositions): string | undefined {
  const source = positions[edge.from]; const target = positions[edge.to];
  return source && target ? edgePath(source, target, edge.kind) : undefined;
}
function sameEdge(left: GraphEdge, right: GraphEdge): boolean {
  return left.from === right.from && left.to === right.to && left.kind === right.kind;
}
function displayNodeName(name: string): string {
  return name.length > 22 ? `${name.slice(0, 21)}…` : name;
}

interface NodeDropPreview { template: NodeTemplate; position: NodePosition }

function movePointer(event: PointerEvent<SVGSVGElement>, props: FrameProps,
  update: (preview: NodeDropPreview | undefined) => void) {
  props.gesture.move(event);
  if (!props.nodeDrag?.moved) return;
  update({ template: props.nodeDrag.template, position: dropPosition(event, props.grid) });
}
function finishPointer(event: PointerEvent<SVGSVGElement>, props: FrameProps,
  update: (preview: NodeDropPreview | undefined) => void) {
  if (props.nodeDrag?.moved) {
    props.onDropNode(props.nodeDrag.template, dropPosition(event, props.grid));
    update(undefined); return;
  }
  props.gesture.finish();
}
function dropPosition(event: PointerEvent<SVGSVGElement>, grid: boolean): NodePosition {
  const point = svgPoint(event.currentTarget, event.clientX, event.clientY);
  const position = { x: point.x - NODE_WIDTH / 2, y: point.y - NODE_HEIGHT / 2 };
  return grid ? snapPosition(position) : position;
}
function NodeDropGhost({ preview }: { preview: NodeDropPreview }) {
  const kind = preview.template.kind.toLowerCase();
  return <g className={`canvas-node-drop-ghost ${kind}`}
    transform={`translate(${preview.position.x} ${preview.position.y})`}>
    <rect width={NODE_WIDTH} height={NODE_HEIGHT} rx="9" />
    <circle className="canvas-port input" cx="0" cy={NODE_HEIGHT / 2} r="8" />
    <text x={NODE_WIDTH / 2} y={NODE_HEIGHT / 2} textAnchor="middle" dominantBaseline="middle">
      {displayNodeName(preview.template.nodeId)}</text>
  </g>;
}
function focusCanvas(event: PointerEvent<SVGElement>) {
  event.currentTarget.ownerSVGElement?.focus({ preventScroll: true });
}
function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number): NodePosition {
  const bounds = svg.getBoundingClientRect(); const view = svg.viewBox.baseVal;
  return { x: (clientX - bounds.left) * (view.width / bounds.width) + view.x,
    y: (clientY - bounds.top) * (view.height / bounds.height) + view.y };
}
function EmptyCanvas() {
  return <section className="graph-canvas"><header><strong>Graph routes</strong></header>
    <p className="graph-error">The graph is unavailable. Run Debug and inspect Console.</p></section>;
}
