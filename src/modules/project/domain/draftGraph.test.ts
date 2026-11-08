import { expect, it } from "vitest";
import { resolveDraftGraph } from "./draftGraph";

it("derives unsaved nodes and routes without invoking backend debug", () => {
  const pipeline = JSON.stringify({ instances: {
    A_1: { node: "A", next: ["B_1"] }, B_1: { node: "B", kind: "Endpoint" },
  } });
  const metadata = JSON.stringify({ nodes: { A: { desc: "Start" }, B: {} } });
  const graph = resolveDraftGraph(undefined, pipeline, metadata);

  expect(graph?.nodes.map((node) => [node.id, node.metadataKey])).toEqual([
    ["A_1", "A"], ["B_1", "B"],
  ]);
  expect(graph?.edges).toEqual([{ from: "A_1", to: "B_1", kind: "Next" }]);
  expect(graph?.nodes[1].kind).toBe("Endpoint");
  expect(graph?.nodes.map((node) => node.label)).toEqual(["A", "B"]);
});
