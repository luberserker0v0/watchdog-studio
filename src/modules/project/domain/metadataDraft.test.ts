import { expect, it } from "vitest";
import type { GraphNode } from "../contracts/PipelineDocument";
import {
  ensureNodeDefinition, resolveNodeDefinitionId, resolvePipelineDraftConfig,
  updateBehaviorSources, updateInstanceField,
} from "./metadataDraft";

it("resolves explicit instance bindings from the pipeline source", () => {
  const sources = {
    metadata: '{"nodes":{"Shared":{"timeout":5}}}',
    pipeline: '{"instances":{"A":{"node":"Shared","timeout":9}}}',
  };

  expect(resolvePipelineDraftConfig(sources, node("Instance", "Shared")).timeout).toBe(9);
});

it("allocates a new definition id for a conflicting cross-pipeline template", () => {
  const source = '{"nodes":{"Click":{"timeout":1},"Click_2":{"timeout":2}}}';

  expect(resolveNodeDefinitionId(source, "Click", { timeout: 1 })).toBe("Click");
  expect(resolveNodeDefinitionId(source, "Click", { timeout: 2 })).toBe("Click_2");
  expect(resolveNodeDefinitionId(source, "Click", { timeout: 3 })).toBe("Click_3");
});

it("copies a dragged definition into metadata when it is missing", () => {
  const source = '{"nodes":{"Existing":{}}}';
  const definition = { recognition: { type: "OCR", expected: "Login" }, actions: [] };
  const updated = ensureNodeDefinition(source, "RecognizeLogin", "Normal", definition);

  expect(JSON.parse(updated).nodes.RecognizeLogin).toEqual(definition);
});

it("writes permitted overrides only to the pipeline source", () => {
  const sources = {
    metadata: '{"nodes":{"Shared":{"timeout":5}}}',
    pipeline: '{"instances":{"A":{"node":"Shared"}}}',
  };

  const updated = updateInstanceField(sources, node("Instance", "Shared"), "timeout", 9);

  expect(updated.metadata).toBe(sources.metadata);
  expect(JSON.parse(updated.pipeline).instances.A.timeout).toBe(9);
});

it("forks a definition and updates the separate instance binding", () => {
  const sources = {
    metadata: '{"nodes":{"Shared":{"actions":[{"type":"DoNothing"}]}}}',
    pipeline: '{"instances":{"A":{"node":"Shared"}}}',
  };

  const updated = updateBehaviorSources(
    sources, node("Instance", "Shared"), ["actions", 0, "type"], "StopTask",
  );

  expect(JSON.parse(updated.metadata).nodes.Shared.actions[0].type).toBe("DoNothing");
  expect(JSON.parse(updated.metadata).nodes.Shared__A.actions[0].type).toBe("StopTask");
  expect(JSON.parse(updated.pipeline).instances.A.node).toBe("Shared__A");
});

function node(source: string, key: string): GraphNode {
  return {
    id: "A", label: "A", kind: "Normal", metadataKey: key,
    metadataSource: source, effectiveConfig: {},
  };
}
