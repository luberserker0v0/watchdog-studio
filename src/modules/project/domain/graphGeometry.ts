import type { GraphEdgeKind } from "../contracts/PipelineDocument";
import {
  NODE_HEIGHT, NODE_WIDTH, inputPortPosition, portPosition, type NodePosition, type NodePositions,
} from "./layoutDraft";

export interface CanvasSize {
  width: number;
  height: number;
}
export function canvasSize(positions: NodePositions): CanvasSize {
  const values = Object.values(positions);
  return {
    width: Math.max(900, ...values.map((point) => point.x + NODE_WIDTH + 100)),
    height: Math.max(520, ...values.map((point) => point.y + NODE_HEIGHT + 100)),
  };
}

export function edgePath(
  source: NodePosition,
  target: NodePosition,
  kind: GraphEdgeKind,
): string {
  const start = portPosition(source, kind);
  const end = inputPortPosition(target);
  const distance = Math.max(60, Math.abs(end.x - start.x) / 2);
  const first = { x: start.x + distance, y: start.y };
  const approach = end.x >= start.x ? -distance : distance;
  const second = { x: end.x + approach, y: end.y };
  return `M ${start.x} ${start.y} C ${first.x} ${first.y}, ${second.x} ${second.y}, ${end.x} ${end.y}`;
}

export function previewPath(start: NodePosition, end: NodePosition): string {
  const distance = Math.max(50, Math.abs(end.x - start.x) / 2);
  return `M ${start.x} ${start.y} C ${start.x + distance} ${start.y}, ${end.x - distance} ${end.y}, ${end.x} ${end.y}`;
}

export function hitTestNode(point: NodePosition, positions: NodePositions): string | undefined {
  return Object.entries(positions).find(([, position]) => (
    point.x >= position.x && point.x <= position.x + NODE_WIDTH
      && point.y >= position.y && point.y <= position.y + NODE_HEIGHT
  ))?.[0];
}

