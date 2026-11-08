import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { GraphEdge, GraphEdgeKind } from "../contracts/PipelineDocument";
import { hitTestNode } from "../domain/graphGeometry";
import {
  NODE_HEIGHT, NODE_WIDTH, snapPosition, type NodePosition, type NodePositions,
} from "../domain/layoutDraft";

type CanvasPointerEvent = ReactPointerEvent<SVGElement>;
export type CanvasGesture = NodeGesture | RouteGesture | EdgeAdjustGesture | MarqueeGesture | PanGesture;

interface NodeGesture {
  type: "node"; nodeIds: string[]; origins: NodePositions;
  start: NodePosition; delta: NodePosition; moved: boolean;
}
interface RouteGesture { type: "route"; sourceId: string; kind: GraphEdgeKind; point: NodePosition }
interface EdgeAdjustGesture {
  type: "edge-adjust"; edge: GraphEdge; endpoint: "source" | "target"; point: NodePosition;
}
interface MarqueeGesture { type: "marquee"; start: NodePosition; point: NodePosition }
interface PanGesture { type: "pan"; client: NodePosition }
export interface CanvasPointerSample { canvas: NodePosition; client: NodePosition }

interface Options {
  positions: NodePositions;
  edges: GraphEdge[];
  selectedNodeIds: string[];
  snap: boolean;
  onMoveNodes: (positions: NodePositions) => void;
  onConnectEdge: (edge: GraphEdge) => void;
  onReplaceEdge: (edge: GraphEdge, replacement: GraphEdge) => void;
  onSelectNode: (nodeId: string, additive?: boolean) => void;
  onSelectNodes: (nodeIds: string[], edges?: GraphEdge[]) => void;
  onPan: (delta: NodePosition) => void;
}

export function useCanvasGesture(options: Options) {
  const state = useGestureValue();
  const starters = gestureStarters(options, state.update);
  const move = (event: CanvasPointerEvent) => {
    const sample = pointerSample(event);
    const current = state.current();
    if (current) state.update(advanceCanvasGesture(current, sample, options.onPan));
  };
  const finish = () => { finishGesture(state.current(), options); state.update(undefined); };
  return { gesture: state.gesture, ...starters, move, finish,
    cancel: () => state.update(undefined) };
}

function useGestureValue() {
  const [gesture, setGesture] = useState<CanvasGesture>();
  const reference = useRef<CanvasGesture | undefined>(undefined);
  const update = (next: CanvasGesture | undefined) => {
    reference.current = next; setGesture(next);
  };
  return { gesture, update, current: () => reference.current };
}

function gestureStarters(options: Options, update: (gesture: CanvasGesture) => void) {
  const beginNode = (nodeId: string, event: CanvasPointerEvent) => {
    if (event.button === 0) { focusCanvas(event); update(nodeGesture(nodeId, event, options)); }
  };
  const beginRoute = (sourceId: string, kind: GraphEdgeKind, event: CanvasPointerEvent) => {
    event.stopPropagation(); focusCanvas(event); options.onSelectNode(sourceId); capture(event);
    update({ type: "route", sourceId, kind, point: canvasPoint(event) });
  };
  const beginBackground = (event: CanvasPointerEvent) => {
    if (event.button !== 0) return;
    focusCanvas(event); capture(event);
    update(event.shiftKey ? marqueeGesture(event) : panGesture(event));
  };
  const beginEdgeAdjust = (edge: GraphEdge, endpoint: EdgeAdjustGesture["endpoint"],
    event: CanvasPointerEvent) => {
    event.stopPropagation(); focusCanvas(event); capture(event);
    update({ type: "edge-adjust", edge, endpoint, point: canvasPoint(event) });
  };
  return { beginNode, beginRoute, beginBackground, beginEdgeAdjust };
}

function nodeGesture(nodeId: string, event: CanvasPointerEvent, options: Options): NodeGesture {
  const additive = event.ctrlKey || event.metaKey;
  const alreadySelected = options.selectedNodeIds.includes(nodeId);
  const selected = alreadySelected ? options.selectedNodeIds : [nodeId];
  if (!alreadySelected || additive) options.onSelectNode(nodeId, additive);
  capture(event);
  return { type: "node", nodeIds: selected, origins: pickPositions(options.positions, selected),
    start: canvasPoint(event), delta: { x: 0, y: 0 }, moved: false };
}

export function advanceCanvasGesture(
  current: CanvasGesture, sample: CanvasPointerSample, onPan: Options["onPan"],
): CanvasGesture {
  if (current.type === "route") return { ...current, point: sample.canvas };
  if (current.type === "edge-adjust") return { ...current, point: sample.canvas };
  if (current.type === "marquee") return { ...current, point: sample.canvas };
  if (current.type === "pan") return movedPan(current, sample.client, onPan);
  const delta = { x: sample.canvas.x - current.start.x, y: sample.canvas.y - current.start.y };
  return { ...current, delta, moved: current.moved || Math.hypot(delta.x, delta.y) > 2 };
}

function movedPan(current: PanGesture, client: NodePosition, onPan: Options["onPan"]): PanGesture {
  onPan({ x: client.x - current.client.x, y: client.y - current.client.y });
  return { ...current, client };
}

function finishGesture(gesture: CanvasGesture | undefined, options: Options) {
  if (gesture?.type === "node" && gesture.moved) options.onMoveNodes(liveNodePositions(gesture, options.snap));
  if (gesture?.type === "route") finishRoute(gesture, options);
  if (gesture?.type === "edge-adjust") finishEdgeAdjust(gesture, options);
  if (gesture?.type === "marquee") finishMarquee(gesture, options);
}

function finishEdgeAdjust(gesture: EdgeAdjustGesture, options: Options) {
  const nodeId = hitTestNode(gesture.point, options.positions);
  if (!nodeId) return;
  const replacement = gesture.endpoint === "source"
    ? { ...gesture.edge, from: nodeId } : { ...gesture.edge, to: nodeId };
  options.onReplaceEdge(gesture.edge, replacement);
}

function finishRoute(gesture: RouteGesture, options: Options) {
  const target = hitTestNode(gesture.point, options.positions);
  if (target) options.onConnectEdge({ from: gesture.sourceId, to: target, kind: gesture.kind });
}

function finishMarquee(gesture: MarqueeGesture, options: Options) {
  const box = normalizedBox(gesture.start, gesture.point);
  const nodes = Object.entries(options.positions).filter(([, position]) => inside(box, position))
    .map(([id]) => id);
  const selected = new Set(nodes);
  const edges = options.edges.filter((edge) => selected.has(edge.from) && selected.has(edge.to));
  options.onSelectNodes(nodes, edges);
}

export function liveNodePositions(gesture: NodeGesture, snap: boolean): NodePositions {
  return Object.fromEntries(Object.entries(gesture.origins).map(([id, origin]) => {
    const position = { x: origin.x + gesture.delta.x, y: origin.y + gesture.delta.y };
    return [id, snap ? snapPosition(position) : position];
  }));
}

function pickPositions(positions: NodePositions, ids: string[]): NodePositions {
  return Object.fromEntries(ids.flatMap((id) => positions[id] ? [[id, positions[id]]] : []));
}

function normalizedBox(start: NodePosition, end: NodePosition) {
  return { left: Math.min(start.x, end.x), top: Math.min(start.y, end.y),
    right: Math.max(start.x, end.x), bottom: Math.max(start.y, end.y) };
}

function inside(box: ReturnType<typeof normalizedBox>, position: NodePosition): boolean {
  return position.x >= box.left && position.y >= box.top
    && position.x + NODE_WIDTH <= box.right && position.y + NODE_HEIGHT <= box.bottom;
}

function marqueeGesture(event: CanvasPointerEvent): MarqueeGesture {
  const point = canvasPoint(event); return { type: "marquee", start: point, point };
}
function panGesture(event: CanvasPointerEvent): PanGesture {
  return { type: "pan", client: { x: event.clientX, y: event.clientY } };
}

function pointerSample(event: CanvasPointerEvent): CanvasPointerSample {
  return { canvas: canvasPoint(event), client: { x: event.clientX, y: event.clientY } };
}

function canvasPoint(event: CanvasPointerEvent): NodePosition {
  const svg = event.currentTarget.ownerSVGElement ?? event.currentTarget as SVGSVGElement;
  const bounds = svg.getBoundingClientRect(); const view = svg.viewBox.baseVal;
  return { x: (event.clientX - bounds.left) * (view.width / bounds.width) + view.x,
    y: (event.clientY - bounds.top) * (view.height / bounds.height) + view.y };
}
function capture(event: CanvasPointerEvent) { event.currentTarget.setPointerCapture(event.pointerId); }
function focusCanvas(event: CanvasPointerEvent) {
  const svg = event.currentTarget.ownerSVGElement ?? event.currentTarget as SVGSVGElement;
  svg.focus({ preventScroll: true });
}
