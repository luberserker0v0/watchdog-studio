import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ProjectSummary } from "../contracts/ProjectSummary";

export async function chooseAndOpenProject(): Promise<ProjectSummary | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Open WatchDog project",
  });
  if (!selected || Array.isArray(selected)) return null;
  return invoke<ProjectSummary>("open_project", { path: selected });
}
