import { expect, it } from "vitest";
import type { NormalizedGraph } from "../contracts/PipelineDocument";
import { canConnectRoute, canCreateRoute, canReplaceRoute } from "./graphRoutes";

const graph: NormalizedGraph = {
  nodes: [
    { id: "A", label: "A", kind: "Normal", metadataSource: "Instance", effectiveConfig: {} },
    { id: "B", label: "B", kind: "Normal", metadataSource: "Instance", effectiveConfig: {} },
    { id: "Done", label: "Done", kind: "Endpoint", metadataSource: "Instance", effectiveConfig: {} },
  ],
  edges: [{ from: "A", to: "B", kind: "Next" }, { from: "A", to: "Done", kind: "Error" }],
};

it("allows a new normal route between eligible nodes", () => {
  expect(canCreateRoute(graph, { from: "B", to: "Done", kind: "Next" })).toBe(true);
});

it("rejects self, endpoint, duplicate, and second error routes", () => {
  expect(canCreateRoute(graph, { from: "A", to: "A", kind: "Next" })).toBe(false);
  expect(canCreateRoute(graph, { from: "Done", to: "A", kind: "Next" })).toBe(false);
  expect(canCreateRoute(graph, { from: "A", to: "B", kind: "Next" })).toBe(false);
  expect(canCreateRoute(graph, { from: "A", to: "B", kind: "Error" })).toBe(false);
});

it("allows the error port to request a different target for replacement", () => {
  expect(canConnectRoute(graph, { from: "A", to: "B", kind: "Error" })).toBe(true);
  expect(canConnectRoute(graph, { from: "A", to: "Done", kind: "Error" })).toBe(false);
});

it("allows edge endpoints to move while preserving graph constraints", () => {
  const next = graph.edges[0];
  const error = graph.edges[1];

  expect(canReplaceRoute(graph, next, { ...next, to: "Done" })).toBe(true);
  expect(canReplaceRoute(graph, next, { ...next, from: "Done" })).toBe(false);
  expect(canReplaceRoute(graph, error, { ...error, from: "B" })).toBe(true);
  expect(canReplaceRoute(graph, error, { ...error, to: "B" })).toBe(true);
});
