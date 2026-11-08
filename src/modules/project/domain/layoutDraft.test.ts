import { expect, it } from "vitest";
import type { NormalizedGraph } from "../contracts/PipelineDocument";
import {
  inputPortPosition, portPosition, resolveNodePositions, snapPosition, updateNodePosition,
} from "./layoutDraft";

const graph: NormalizedGraph = {
  nodes: [node("A"), node("B"), node("C")],
  edges: [{ from: "A", to: "B", kind: "Next" }, { from: "A", to: "C", kind: "Next" }],
};

it("creates and updates a schema-compatible layout source", () => {
  const created = updateNodePosition(undefined, "A", { x: 21.4, y: 42.8 });
  const updated = updateNodePosition(created, "B", { x: 100, y: 200 });

  expect(JSON.parse(updated).nodes).toEqual({ A: { x: 21, y: 43 }, B: { x: 100, y: 200 } });
});

it("uses deterministic topology positions and explicit overrides", () => {
  const source = '{"nodes":{"B":{"x":9,"y":11}}}';
  const positions = resolveNodePositions(graph, source);

  expect(positions.A.y).toBeLessThan(positions.C.y);
  expect(positions.B).toEqual({ x: 9, y: 11 });
});

it("snaps nodes and exposes distinct Next and Error ports", () => {
  expect(snapPosition({ x: 31, y: 49 })).toEqual({ x: 40, y: 40 });
  expect(portPosition({ x: 0, y: 0 }, "Next").y)
    .not.toBe(portPosition({ x: 0, y: 0 }, "Error").y);
  expect(inputPortPosition({ x: 20, y: 40 })).toEqual({ x: 20, y: 72 });
});

function node(id: string) {
  return { id, label: id, kind: "Normal", metadataSource: "Instance", effectiveConfig: {} };
}
