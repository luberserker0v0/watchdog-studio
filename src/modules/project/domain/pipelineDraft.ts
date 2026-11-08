import { applyEdits, modify, type FormattingOptions } from "jsonc-parser";
import type { GraphEdge } from "../contracts/PipelineDocument";

export interface NewPipelineInstance {
  instanceId: string;
  nodeId: string;
  label?: string;
}

export function addPipelineInstance(source: string, instance: NewPipelineInstance): string {
  const value = instance.label ? { node: instance.nodeId, label: instance.label } : { node: instance.nodeId };
  return edit(source, ["instances", instance.instanceId], value);
}

export function removePipelineNodes(source: string, nodeIds: string[]): string {
  return nodeIds.reduce((current, nodeId) => removeNodeAndRoutes(current, nodeId), source);
}

export function createInstanceId(nodeId: string, uuid = crypto.randomUUID()): string {
  const safe = nodeId.replace(/[^A-Za-z0-9_-]/g, "_").replace(/^[^A-Za-z_]/, "Node_$&");
  return `${safe}_${uuid}`;
}

export function createNodeName(source: string, nodeId: string): string {
  const root = JSON.parse(source) as { instances?: Record<string, { node?: unknown; label?: unknown }> };
  const names = Object.values(root.instances ?? {}).map((item) => (
    typeof item.label === "string" ? item.label : item.node
  ));
  if (!names.includes(nodeId)) return nodeId;
  let index = 2;
  while (names.includes(`${nodeId} ${index}`)) index += 1;
  return `${nodeId} ${index}`;
}

export function addPipelineEdge(source: string, edge: GraphEdge): string {
  if (edge.kind === "Error") return edit(source, ["instances", edge.from, "error"], edge.to);
  const next = nextTargets(source, edge.from);
  if (next.includes(edge.to)) return source;
  return edit(source, ["instances", edge.from, "next"], [...next, edge.to]);
}

export function removePipelineEdge(source: string, edge: GraphEdge): string {
  if (edge.kind === "Error") return edit(source, ["instances", edge.from, "error"], undefined);
  const next = nextTargets(source, edge.from).filter((target) => target !== edge.to);
  return edit(source, ["instances", edge.from, "next"], next.length ? next : undefined);
}

export function removePipelineEdges(source: string, edges: GraphEdge[]): string {
  return edges.reduce(removePipelineEdge, source);
}

export function replacePipelineEdge(
  source: string,
  edge: GraphEdge,
  replacement: GraphEdge,
): string {
  return addPipelineEdge(removePipelineEdge(source, edge), replacement);
}

function nextTargets(source: string, nodeId: string): string[] {
  const root = JSON.parse(source) as { instances?: Record<string, { next?: unknown }> };
  const next = root.instances?.[nodeId]?.next;
  return Array.isArray(next) ? next.filter((value): value is string => typeof value === "string") : [];
}

function edit(source: string, path: string[], value: unknown): string {
  const edits = modify(source, path, value, { formattingOptions: formatting(source) });
  return applyEdits(source, edits);
}

function removeNodeAndRoutes(source: string, nodeId: string): string {
  const root = JSON.parse(source) as { instances?: Record<string, PipelineInstance> };
  const instances = root.instances ?? {};
  let next = edit(source, ["instances", nodeId], undefined);
  Object.entries(instances).forEach(([id, instance]) => {
    if (id === nodeId) return;
    const routes = instance.next?.filter((target) => target !== nodeId);
    if (routes?.length !== instance.next?.length) next = edit(next, ["instances", id, "next"], routes?.length ? routes : undefined);
    if (instance.error === nodeId) next = edit(next, ["instances", id, "error"], undefined);
  });
  return next;
}

interface PipelineInstance {
  next?: string[];
  error?: string;
}

function formatting(source: string): FormattingOptions {
  return {
    eol: source.includes("\r\n") ? "\r\n" : "\n",
    insertSpaces: !/^\t+/m.test(source),
    tabSize: source.match(/^( +)\S/m)?.[1]?.length ?? 2,
  };
}
