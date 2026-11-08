import { invoke } from "@tauri-apps/api/core";
import type { InitializedProject } from "../contracts/InitializedProject";
import type { InitializeProjectRequest } from "../contracts/ProjectSummary";

export function initializeProject(request: InitializeProjectRequest): Promise<InitializedProject> {
  return invoke<InitializedProject>("initialize_project", { request });
}
