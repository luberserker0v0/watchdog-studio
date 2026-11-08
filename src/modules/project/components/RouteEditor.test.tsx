import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { GraphNode, NormalizedGraph } from "../contracts/PipelineDocument";
import RouteEditor from "./RouteEditor";

it("renders outgoing routes and a creator for a normal node", () => {
  const html = render(node("A", "Normal"), {
    nodes: [node("A", "Normal"), node("B", "Endpoint")],
    edges: [{ from: "A", to: "B", kind: "Next" }],
  });

  expect(html).toContain("1 outgoing");
  expect(html).toContain("aria-label=\"Add route\"");
  expect(html).toContain("Remove");
});

it("does not offer outgoing route creation for an endpoint", () => {
  const endpoint = node("Done", "Endpoint");
  const html = render(endpoint, { nodes: [endpoint], edges: [] });

  expect(html).toContain("Endpoint nodes cannot have outgoing routes.");
  expect(html).not.toContain("Add route");
});

it("marks the route selected from the graph", () => {
  const selected = { from: "A", to: "B", kind: "Next" } as const;
  const graph: NormalizedGraph = {
    nodes: [node("A", "Normal"), node("B", "Endpoint")], edges: [selected],
  };

  const html = renderToStaticMarkup(
    <RouteEditor graph={graph} node={graph.nodes[0]} onAdd={vi.fn()}
      onRemove={vi.fn()} onReplace={vi.fn()} selectedEdge={selected} />,
  );

  expect(html).toContain("route-row selected");
});

function render(selected: GraphNode, graph: NormalizedGraph): string {
  return renderToStaticMarkup(
    <RouteEditor graph={graph} node={selected} onAdd={vi.fn()}
      onRemove={vi.fn()} onReplace={vi.fn()} />,
  );
}

function node(id: string, kind: string): GraphNode {
  return {
    id, label: id, kind, metadataSource: "Instance", effectiveConfig: {},
  };
}
