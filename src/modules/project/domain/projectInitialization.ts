import type { InitializeProjectRequest } from "../contracts/ProjectSummary";

export function initialProjectRequest(folderName: string): InitializeProjectRequest {
  return {
    projectName: folderName,
    projectId: suggestedProjectId(folderName),
    version: "0.1.0",
    pipelineName: "main",
  };
}

export function projectInitializationError(request: InitializeProjectRequest): string | undefined {
  if (!request.projectName.trim()) return "Project name is required.";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(request.projectId)) {
    return "Project ID must start with a letter or number and use only letters, numbers, '.', '_' or '-'.";
  }
  if (!request.version.trim()) return "Version is required.";
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(request.pipelineName)) {
    return "Pipeline name must start with a letter and use only letters, numbers, '_' or '-'.";
  }
  return undefined;
}

export function suggestedProjectId(name: string): string {
  const value = name.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
  return value || "watchdog-project";
}
