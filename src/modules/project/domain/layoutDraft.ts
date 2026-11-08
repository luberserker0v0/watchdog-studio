import { applyEdits, modify } from "jsonc-parser";
import type { GraphEdgeKind, NormalizedGraph } from "../contracts/PipelineDocument";

export interface NodePosition {
  x: number;
  y: number;
}

export type NodePositions = Record<string, NodePosition>;

export const NODE_WIDTH = 160;
export const NODE_HEIGHT = 64;
export const GRID_SIZE = 20;

export function resolveNodePositions(
  graph: NormalizedGraph,
  layoutSource: string | undefined,
): NodePositions {
  return { ...automaticPositions(graph), ...layoutPositions(layoutSource) };
}

export function updateNodePosition(
  source: string | undefined,
  nodeId: string,
  position: NodePosition,
): string {
  const original = source ?? "{\n  \"nodes\": {}\n}\n";
  const edits = modify(original, ["nodes", nodeId], rounded(position), {
    formattingOptions: { insertSpaces: true, tabSize: 2, eol: lineEnding(original) },
  });
  return applyEdits(original, edits);
}

export function updateNodePositions(source: string | undefined, positions: NodePositions): string {
  return Object.entries(positions).reduce(
    (current, [nodeId, position]) => updateNodePosition(current, nodeId, position),
    source,
  ) ?? "{\n  \"nodes\": {}\n}\n";
}

export function removeLayoutNodes(source: string | undefined, nodeIds: string[]): string | undefined {
  if (!source) return source;
  return nodeIds.reduce((current, nodeId) => removeLayoutNode(current, nodeId), source);
}

export function snapPosition(position: NodePosition): NodePosition {
  return {
    x: Math.max(GRID_SIZE, Math.round(position.x / GRID_SIZE) * GRID_SIZE),
    y: Math.max(GRID_SIZE, Math.round(position.y / GRID_SIZE) * GRID_SIZE),
  };
}

export function portPosition(position: NodePosition, kind: GraphEdgeKind): NodePosition {
  return {
    x: position.x + NODE_WIDTH,
    y: position.y + NODE_HEIGHT * (kind === "Next" ? 0.35 : 0.7),
  };
}

export function inputPortPosition(position: NodePosition): NodePosition {
  return { x: position.x, y: position.y + NODE_HEIGHT / 2 };
}

function automaticPositions(graph: NormalizedGraph): NodePositions {
  const depths = nodeDepths(graph);
  const groups = new Map<number, string[]>();
  graph.nodes.forEach((node) => {
    const depth = depths[node.id] ?? 0;
    groups.set(depth, [...(groups.get(depth) ?? []), node.id]);
  });
  return Object.fromEntries([...groups.entries()].flatMap(([depth, ids]) => (
    ids.map((id, index) => [id, autoPosition(depth, index)])
  )));
}

function nodeDepths(graph: NormalizedGraph): Record<string, number> {
  const depths = Object.fromEntries(graph.nodes.map((node) => [node.id, 0]));
  for (let pass = 0; pass < graph.nodes.length; pass += 1) {
    let changed = false;
    graph.edges.forEach((edge) => {
      const next = Math.max(depths[edge.to] ?? 0, (depths[edge.from] ?? 0) + 1);
      if (next !== depths[edge.to]) { depths[edge.to] = next; changed = true; }
    });
    if (!changed) break;
  }
  return depths;
}

function autoPosition(depth: number, index: number) {
  return { x: 60 + index * 220, y: 40 + depth * 130 };
}

function layoutPositions(source: string | undefined): NodePositions {
  try {
    const parsed: unknown = source ? JSON.parse(source) : undefined;
    if (!parsed || typeof parsed !== "object") return {};
    const nodes = (parsed as { nodes?: unknown }).nodes;
    return nodes && typeof nodes === "object" ? nodes as NodePositions : {};
  } catch {
    return {};
  }
}

function rounded(position: NodePosition): NodePosition {
  return { x: Math.round(position.x), y: Math.round(position.y) };
}

function lineEnding(source: string): string {
  return source.includes("\r\n") ? "\r\n" : "\n";
}

function removeLayoutNode(source: string, nodeId: string): string {
  const edits = modify(source, ["nodes", nodeId], undefined, {
    formattingOptions: { insertSpaces: true, tabSize: 2, eol: lineEnding(source) },
  });
  return applyEdits(source, edits);
}
