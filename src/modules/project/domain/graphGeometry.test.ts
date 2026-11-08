import { expect, it } from "vitest";
import { edgePath, hitTestNode } from "./graphGeometry";

it("starts each route at its distinct source port", () => {
  const source = { x: 20, y: 40 };
  const target = { x: 300, y: 200 };

  expect(edgePath(source, target, "Next")).toMatch(/^M 180 62\.4/);
  expect(edgePath(source, target, "Error")).toMatch(/^M 180 84\.8/);
  expect(edgePath(source, target, "Next")).toMatch(/300 232$/);
});

it("leaves a source port horizontally before routing downward", () => {
  const path = edgePath({ x: 20, y: 40 }, { x: 20, y: 200 }, "Next");

  expect(path).toMatch(/^M 180 62\.4 C 260 62\.4,/);
});

it("finds a drop target inside node bounds", () => {
  const positions = { A: { x: 20, y: 40 }, B: { x: 300, y: 200 } };

  expect(hitTestNode({ x: 340, y: 220 }, positions)).toBe("B");
  expect(hitTestNode({ x: 250, y: 100 }, positions)).toBeUndefined();
});
