import { useState } from "react";
import type { GraphEdge } from "../contracts/PipelineDocument";

export function useGraphSelection() {
  const [nodeIds, setNodeIds] = useState<string[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const selectNode = (nodeId: string, additive = false) => {
    setNodeIds((current) => additive ? toggle(current, nodeId) : [nodeId]);
    if (!additive) setEdges([]);
  };
  const selectNodes = (next: string[], nextEdges: GraphEdge[] = []) => {
    setNodeIds(next); setEdges(nextEdges);
  };
  const selectEdge = (edge: GraphEdge, additive = false) => {
    setEdges((current) => additive ? toggleEdge(current, edge) : [edge]);
    if (!additive) setNodeIds([]);
  };
  const clear = () => { setNodeIds([]); setEdges([]); };
  return {
    nodeIds, edges, nodeId: nodeIds[nodeIds.length - 1], edge: edges[edges.length - 1], selectNode,
    selectNodes, selectEdge, clear, clearEdge: () => setEdges([]),
  };
}

function toggle(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function toggleEdge(values: GraphEdge[], edge: GraphEdge): GraphEdge[] {
  return values.some((item) => sameEdge(item, edge))
    ? values.filter((item) => !sameEdge(item, edge)) : [...values, edge];
}

function sameEdge(left: GraphEdge, right: GraphEdge): boolean {
  return left.from === right.from && left.to === right.to && left.kind === right.kind;
}
