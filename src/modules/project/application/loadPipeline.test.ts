import { beforeEach, expect, it, vi } from "vitest";
import { loadPipeline, validatePipelineDraft } from "./loadPipeline";
import { savePipelineDraft } from "./savePipelineDraft";

const invoke = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({ invoke }));

beforeEach(() => invoke.mockReset());

it("loads a pipeline through the selected backend project session", async () => {
  const document = { name: "login", diagnostics: [] };
  invoke.mockResolvedValue(document);

  await expect(loadPipeline("flows/login.pipeline.json")).resolves.toBe(document);
  expect(invoke).toHaveBeenCalledWith("load_pipeline", {
    pipelinePath: "flows/login.pipeline.json",
  });
});

it("validates an in-memory metadata draft without saving it", async () => {
  const validation = { diagnostics: [], graph: { nodes: [], edges: [] } };
  invoke.mockResolvedValue(validation);

  await expect(validatePipelineDraft(
    "flows/login.pipeline.json", "{\"instances\":{}}", "{\"nodes\":{}}", "{\"nodes\":{}}",
  ))
    .resolves.toBe(validation);
  expect(invoke).toHaveBeenCalledWith("validate_pipeline_draft", {
    pipelinePath: "flows/login.pipeline.json",
    pipelineSource: "{\"instances\":{}}",
    metadataSource: "{\"nodes\":{}}",
    layoutSource: "{\"nodes\":{}}",
  });
});

it("saves an explicitly versioned pipeline draft", async () => {
  const request = {
    pipelinePath: "flows/login.pipeline.json", expectedPipelineSource: "old pipeline",
    expectedMetadataSource: "old meta",
    expectedLayoutSource: undefined,
    pipelineSource: "new pipeline", metadataSource: "new meta",
    layoutSource: "{\"nodes\":{}}",
  };
  invoke.mockResolvedValue({ name: "login" });

  await savePipelineDraft(request);

  expect(invoke).toHaveBeenCalledWith("save_pipeline_draft", { request });
});
