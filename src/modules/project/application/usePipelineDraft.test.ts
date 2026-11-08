import { expect, it } from "vitest";
import { routeDraftSources } from "./usePipelineDraft";

it("pins every current node position when a route changes", () => {
  const sources = { pipeline: '{"instances":{}}', metadata: '{"nodes":{}}' };
  const updated = routeDraftSources(sources, '{"instances":{"A":{"node":"A"}}}', {
    A: { x: 60, y: 40 }, B: { x: 280, y: 170 },
  });

  expect(JSON.parse(updated.layout ?? "{}").nodes).toEqual({
    A: { x: 60, y: 40 }, B: { x: 280, y: 170 },
  });
});
