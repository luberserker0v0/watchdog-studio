import type { GraphEdge, NormalizedGraph } from "../contracts/PipelineDocument";

export function canCreateRoute(graph: NormalizedGraph, edge: GraphEdge): boolean {
  if (!validEndpoints(graph, edge) || exactRouteExists(graph, edge)) return false;
  return edge.kind !== "Error" || !errorRoute(graph, edge.from);
}

export function canConnectRoute(graph: NormalizedGraph, edge: GraphEdge): boolean {
  return validEndpoints(graph, edge) && !exactRouteExists(graph, edge);
}

export function canReplaceRoute(
  graph: NormalizedGraph, current: GraphEdge, replacement: GraphEdge,
): boolean {
  if (sameEdge(current, replacement) || !validEndpoints(graph, replacement)) return false;
  const others = graph.edges.filter((edge) => !sameEdge(edge, current));
  if (others.some((edge) => sameEdge(edge, replacement))) return false;
  return replacement.kind !== "Error"
    || !others.some((edge) => edge.from === replacement.from && edge.kind === "Error");
}

export function errorRoute(graph: NormalizedGraph, sourceId: string): GraphEdge | undefined {
  return graph.edges.find((edge) => edge.from === sourceId && edge.kind === "Error");
}

function validEndpoints(graph: NormalizedGraph, edge: GraphEdge): boolean {
  const source = graph.nodes.find((node) => node.id === edge.from);
  const targetExists = graph.nodes.some((node) => node.id === edge.to);
  return Boolean(source && targetExists && source.kind !== "Endpoint" && edge.from !== edge.to);
}

function exactRouteExists(graph: NormalizedGraph, edge: GraphEdge): boolean {
  return graph.edges.some((item) => sameEdge(item, edge));
}

export function sameEdge(left: GraphEdge | undefined, right: GraphEdge | undefined): boolean {
  return Boolean(left && right && left.from === right.from
    && left.to === right.to && left.kind === right.kind);
}
