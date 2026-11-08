import { useState } from "react";
import type { PipelineDocument } from "../contracts/PipelineDocument";
import type { PipelineSummary, ProjectSummary } from "../contracts/ProjectSummary";
import type { InitializeProjectRequest } from "../contracts/ProjectSummary";
import type { InitializedProject } from "../contracts/InitializedProject";
import { initializeProject as initializeProjectSession } from "./initializeProject";
import { loadPipeline } from "./loadPipeline";
import { chooseAndOpenProject } from "./openProject";
import { closeWorkspaceTab } from "../domain/workspaceTabs";

export function useProjectWorkspace() {
  const state = useWorkspaceState();
  const run = createRunner(state.setBusy, state.setError);
  const loadDocument = (pipeline: PipelineSummary) => cachedLoad(
    pipeline, state.documents, run, state.setDocuments,
  );
  const openProject = () => run(async () => applyProject(await chooseAndOpenProject(), state));
  const initializeProject = async (request: InitializeProjectRequest) => {
    await run(async () => applyInitialized(await initializeProjectSession(request), state));
  };
  const openPipeline = async (pipeline: PipelineSummary) => {
    const document = await loadDocument(pipeline);
    if (document) activateDocument(document.pipelinePath, state);
  };
  const documentSaved = (saved: PipelineDocument) => saveDocument(saved, state);
  const closePipeline = (path: string) => closeDocument(
    path, state.documents, state.openPaths, state.activePath, state,
  );
  const closeProject = () => clearProject(state);
  return {
    summary: state.summary, documents: state.documents, openPaths: state.openPaths,
    activePath: state.activePath, error: state.error, busy: state.busy,
    openProject, initializeProject, openPipeline, loadDocument, setActivePath: state.setActivePath,
    closePipeline, closeProject, documentSaved,
  };
}

function applyInitialized(initialized: InitializedProject, state: ProjectState) {
  state.setSummary(initialized.summary);
  state.setDocuments([initialized.document]);
  state.setOpenPaths([initialized.document.pipelinePath]);
  state.setActivePath(initialized.document.pipelinePath);
}

function useWorkspaceState() {
  const [summary, setSummary] = useState<ProjectSummary>();
  const [documents, setDocuments] = useState<PipelineDocument[]>([]);
  const [openPaths, setOpenPaths] = useState<string[]>([]);
  const [activePath, setActivePath] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  return {
    summary, setSummary, documents, setDocuments, openPaths, setOpenPaths,
    activePath, setActivePath, error, setError, busy, setBusy,
  };
}

function createRunner(setBusy: ProjectState["setBusy"], setError: ProjectState["setError"]): Runner {
  return async <T,>(operation: () => Promise<T>) => {
    setBusy(true); setError(undefined);
    try { return await operation(); }
    catch (reason) { setError(String(reason)); return undefined; }
    finally { setBusy(false); }
  };
}

function activateDocument(path: string, state: ProjectState) {
  state.setOpenPaths((current) => current.includes(path) ? current : [...current, path]);
  state.setActivePath(path);
}

function saveDocument(saved: PipelineDocument, state: ProjectState) {
  state.setDocuments((current) => upsertDocument(current, saved));
  state.setSummary((current) => current && updateSavedPipeline(current, saved));
}

async function cachedLoad(
  pipeline: PipelineSummary, documents: PipelineDocument[], run: Runner,
  setDocuments: React.Dispatch<React.SetStateAction<PipelineDocument[]>>,
) {
  const cached = documents.find((item) => item.pipelinePath === pipeline.pipelinePath);
  if (cached) return cached;
  const loaded = await run(() => loadPipeline(pipeline.pipelinePath));
  if (loaded) setDocuments((current) => upsertDocument(current, loaded));
  return loaded;
}

function applyProject(project: ProjectSummary | null, setters: ProjectSetters) {
  if (!project) return;
  setters.setSummary(project);
  setters.setDocuments([]);
  setters.setOpenPaths([]);
  setters.setActivePath(undefined);
}

function clearProject(setters: ProjectSetters) {
  setters.setSummary(undefined);
  setters.setDocuments([]);
  setters.setOpenPaths([]);
  setters.setActivePath(undefined);
  setters.setError(undefined);
}

function closeDocument(path: string, documents: PipelineDocument[], openPaths: string[],
  active: string | undefined,
  setters: Pick<ProjectSetters, "setDocuments" | "setOpenPaths" | "setActivePath">) {
  const closed = closeWorkspaceTab(documents, openPaths, active, path);
  setters.setDocuments(closed.documents);
  setters.setOpenPaths(closed.openPaths);
  setters.setActivePath(closed.activePath);
}

function upsertDocument(documents: PipelineDocument[], saved: PipelineDocument) {
  const exists = documents.some((item) => item.pipelinePath === saved.pipelinePath);
  return exists ? documents.map((item) => item.pipelinePath === saved.pipelinePath ? saved : item)
    : [...documents, saved];
}

function updateSavedPipeline(summary: ProjectSummary, document: PipelineDocument): ProjectSummary {
  const pipelines = summary.pipelines.map((pipeline) => pipeline.pipelinePath === document.pipelinePath
    ? { ...pipeline, layoutPath: layoutPath(document) } : pipeline);
  return { ...summary, pipelines };
}

function layoutPath(document: PipelineDocument): string | undefined {
  return document.layoutSource === undefined ? undefined
    : document.pipelinePath.replace(/\.pipeline\.json$/i, ".layout.json");
}

type Runner = <T>(operation: () => Promise<T>) => Promise<T | undefined>;
interface ProjectSetters {
  setSummary: React.Dispatch<React.SetStateAction<ProjectSummary | undefined>>;
  setDocuments: React.Dispatch<React.SetStateAction<PipelineDocument[]>>;
  setOpenPaths: React.Dispatch<React.SetStateAction<string[]>>;
  setActivePath: React.Dispatch<React.SetStateAction<string | undefined>>;
  setError: React.Dispatch<React.SetStateAction<string | undefined>>;
}
type ProjectState = ReturnType<typeof useWorkspaceState>;
