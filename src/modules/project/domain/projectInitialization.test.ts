import { expect, it } from "vitest";
import {
  initialProjectRequest, projectInitializationError, suggestedProjectId,
} from "./projectInitialization";

it("suggests safe project defaults from the selected folder", () => {
  expect(initialProjectRequest("My Automation")).toEqual({
    projectName: "My Automation", projectId: "my-automation",
    version: "0.1.0", pipelineName: "main",
  });
  expect(suggestedProjectId("繁體中文")).toBe("watchdog-project");
});

it("rejects path-like pipeline names before invoking the backend", () => {
  const request = initialProjectRequest("Demo");
  expect(projectInitializationError({ ...request, pipelineName: "../escape" }))
    .toContain("Pipeline name");
  expect(projectInitializationError(request)).toBeUndefined();
});
