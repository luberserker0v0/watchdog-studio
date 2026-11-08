import { expect, it } from "vitest";
import {
  addPipelineEdge, addPipelineInstance, createInstanceId, createNodeName, removePipelineEdge,
  removePipelineEdges, removePipelineNodes, replacePipelineEdge,
} from "./pipelineDraft";

it("adds ordered Next routes and a single Error route", () => {
  const source = '{\r\n  "instances": { "A": { "node": "A" } }\r\n}';
  const next = addPipelineEdge(source, { from: "A", to: "B", kind: "Next" });
  const error = addPipelineEdge(next, { from: "A", to: "Failed", kind: "Error" });

  expect(JSON.parse(error).instances.A).toMatchObject({ next: ["B"], error: "Failed" });
  expect(error).toContain("\r\n");
});

it("creates readable unique node names without exposing instance UUIDs", () => {
  const source = JSON.stringify({ instances: {
    first: { node: "ClickLogin", label: "ClickLogin" },
    second: { node: "Other" },
  } });

  expect(createNodeName(source, "ClickLogin")).toBe("ClickLogin 2");
  expect(createNodeName(source, "VerifySuccess")).toBe("VerifySuccess");
});

it("adds an instance with its definition id and a generated instance id", () => {
  const source = '{"instances":{}}';
  const id = createInstanceId("ClickLogin", "12345678-1234-1234-1234-123456789abc");
  const updated = addPipelineInstance(source, { instanceId: id, nodeId: "ClickLogin" });

  expect(id).toBe("ClickLogin_12345678-1234-1234-1234-123456789abc");
  expect(JSON.parse(updated).instances[id]).toEqual({ node: "ClickLogin" });
});

it("removes nodes and every incoming route to them", () => {
  const source = JSON.stringify({ instances: {
    A: { node: "A", next: ["B", "C"], error: "B" },
    B: { node: "B", next: ["C"] }, C: { node: "C" },
  } });
  const updated = JSON.parse(removePipelineNodes(source, ["B"]));

  expect(updated.instances.B).toBeUndefined();
  expect(updated.instances.A).toEqual({ node: "A", next: ["C"] });
});

it("replaces and removes routes without changing unrelated instance fields", () => {
  const source = JSON.stringify({
    instances: { A: { node: "Shared", next: ["B", "C"], timeout: 9 } },
  }, null, 2);
  const replaced = replacePipelineEdge(
    source,
    { from: "A", to: "B", kind: "Next" },
    { from: "A", to: "D", kind: "Next" },
  );
  const removed = removePipelineEdge(replaced, { from: "A", to: "C", kind: "Next" });

  expect(JSON.parse(removed).instances.A).toEqual({ node: "Shared", next: ["D"], timeout: 9 });
});

it("removes multiple selected routes in one source update", () => {
  const source = JSON.stringify({ instances: {
    A: { node: "A", next: ["B", "C"], error: "D" }, B: { node: "B" },
  } });
  const updated = removePipelineEdges(source, [
    { from: "A", to: "B", kind: "Next" }, { from: "A", to: "D", kind: "Error" },
  ]);

  expect(JSON.parse(updated).instances.A).toEqual({ node: "A", next: ["C"] });
});
