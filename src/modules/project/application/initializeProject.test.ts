import { beforeEach, expect, it, vi } from "vitest";
import { initializeProject } from "./initializeProject";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

beforeEach(() => invoke.mockReset());

it("initializes the current confined project session", async () => {
  const request = {
    projectName: "Demo", projectId: "demo", version: "0.1.0", pipelineName: "main",
  };
  invoke.mockResolvedValue({ summary: {}, document: {} });

  await initializeProject(request);

  expect(invoke).toHaveBeenCalledWith("initialize_project", { request });
});
