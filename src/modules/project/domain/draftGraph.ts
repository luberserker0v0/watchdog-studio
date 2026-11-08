import type { GraphEdge, GraphNode, NormalizedGraph } from "../contracts/PipelineDocument";

export function resolveDraftGraph(
  baseline: NormalizedGraph | undefined,
  pipelineSource: string,
  metadataSource: string,
): NormalizedGraph | undefined {
  try {
    const pipeline = parseObject(pipelineSource);
    const metadata = parseObject(metadataSource);
    const instances = objectValue(pipeline.instances) ?? {};
    const definitions = objectValue(metadata.nodes) ?? {};
    const nodes = Object.entries(instances).map(([id, value]) => draftNode(id, value, definitions));
    return { nodes: mergeBaseline(nodes, baseline), edges: draftEdges(instances) };
  } catch {
    return baseline;
  }
}

function draftNode(id: string, value: unknown, definitions: Record<string, unknown>): GraphNode {
  const instance = objectValue(value) ?? {};
  const nodeId = typeof instance.node === "string" ? instance.node : "";
  const definition = objectValue(definitions[nodeId]) ?? {};
  const config = { ...definition, ...instance };
  return {
    id, label: text(instance.label, nodeId || id), kind: text(config.kind, "Normal"),
    metadataKey: nodeId, metadataSource: "metadata", effectiveConfig: config,
    instanceConfig: instance,
  };
}

function draftEdges(instances: Record<string, unknown>): GraphEdge[] {
  return Object.entries(instances).flatMap(([from, value]) => instanceEdges(from, value));
}

function instanceEdges(from: string, value: unknown): GraphEdge[] {
  const instance = objectValue(value) ?? {};
  const next = Array.isArray(instance.next) ? instance.next.filter(isString) : [];
  const edges = next.map((to): GraphEdge => ({ from, to, kind: "Next" }));
  if (typeof instance.error === "string") edges.push({ from, to: instance.error, kind: "Error" });
  return edges;
}

function mergeBaseline(nodes: GraphNode[], baseline?: NormalizedGraph): GraphNode[] {
  const previous = new Map(baseline?.nodes.map((node) => [node.id, node]));
  return nodes.map((node) => ({ ...previous.get(node.id), ...node }));
}

function parseObject(source: string): Record<string, unknown> {
  const value: unknown = JSON.parse(source);
  const object = objectValue(value);
  if (!object) throw new Error("Expected JSON object");
  return object;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
