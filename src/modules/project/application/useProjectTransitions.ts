import { useCallback, useEffect, useRef, useState } from "react";
import {
  CLOSE_PROJECT_EVENT, OPEN_PROJECT_EVENT,
} from "../../../shared/contracts/studioEvents";
import type {
  PipelineDraftStatus, SavePipelineSession,
} from "../contracts/ProjectDocumentSession";
import { canSaveAllDrafts, dirtyDrafts } from "../domain/projectTransitions";

export type ProjectTransitionIntent = "open" | "close";

interface Commands {
  hasProject: boolean;
  openProject: () => Promise<unknown>;
  closeProject: () => void;
}

export function useProjectTransitions(commands: Commands) {
  const [statuses, setStatuses] = useState<Record<string, PipelineDraftStatus>>({});
  const [pending, setPending] = useState<ProjectTransitionIntent>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const saveOperations = useRef(new Map<string, SavePipelineSession>());
  const dirty = dirtyDrafts(statuses);
  const execute = useCallback(async (intent: ProjectTransitionIntent) => {
    if (intent === "open") await commands.openProject(); else commands.closeProject();
  }, [commands]);
  const request = useCallback((intent: ProjectTransitionIntent) => {
    if (intent === "close" && !commands.hasProject) return;
    if (dirty.length) { setPending(intent); setError(undefined); }
    else void execute(intent);
  }, [commands.hasProject, dirty, execute]);
  useProjectTransitionEvents(request);
  const registry = useDraftRegistry(setStatuses, saveOperations);
  const actions = useTransitionActions({ pending, dirty, saving, setPending, setSaving,
    setError, saveOperations, execute });
  return { pending, dirty, saving, error, ...registry, ...actions };
}

function useProjectTransitionEvents(request: (intent: ProjectTransitionIntent) => void) {
  useEffect(() => {
    const open = () => request("open"); const close = () => request("close");
    window.addEventListener(OPEN_PROJECT_EVENT, open);
    window.addEventListener(CLOSE_PROJECT_EVENT, close);
    return () => {
      window.removeEventListener(OPEN_PROJECT_EVENT, open);
      window.removeEventListener(CLOSE_PROJECT_EVENT, close);
    };
  }, [request]);
}

function useDraftRegistry(
  setStatuses: React.Dispatch<React.SetStateAction<Record<string, PipelineDraftStatus>>>,
  operations: React.RefObject<Map<string, SavePipelineSession>>,
) {
  const reportStatus = useCallback((path: string, status?: PipelineDraftStatus) => {
    setStatuses((current) => updatedStatuses(current, path, status));
  }, [setStatuses]);
  const registerSave = useCallback((path: string, save?: SavePipelineSession) => {
    if (save) operations.current.set(path, save); else operations.current.delete(path);
  }, [operations]);
  return { reportStatus, registerSave };
}

function updatedStatuses(current: Record<string, PipelineDraftStatus>, path: string,
  status?: PipelineDraftStatus) {
  if (!status) {
    if (!(path in current)) return current;
    const next = { ...current }; delete next[path]; return next;
  }
  if (sameStatus(current[path], status)) return current;
  return { ...current, [path]: status };
}

function sameStatus(left: PipelineDraftStatus | undefined, right: PipelineDraftStatus) {
  return left?.name === right.name && left.dirty === right.dirty
    && left.canSave === right.canSave && left.saving === right.saving;
}

interface ActionContext {
  pending?: ProjectTransitionIntent; dirty: PipelineDraftStatus[]; saving: boolean;
  setPending: React.Dispatch<React.SetStateAction<ProjectTransitionIntent | undefined>>;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | undefined>>;
  saveOperations: React.RefObject<Map<string, SavePipelineSession>>;
  execute: (intent: ProjectTransitionIntent) => Promise<void>;
}

function useTransitionActions(context: ActionContext) {
  const cancel = useCallback(() => {
    context.setPending(undefined); context.setError(undefined);
  }, [context]);
  const discard = useCallback(async () => {
    const intent = context.pending; cancel();
    if (intent) await context.execute(intent);
  }, [cancel, context]);
  const saveAll = useCallback(async () => {
    if (!context.pending || context.saving) return;
    context.setSaving(true); context.setError(undefined);
    const results = await Promise.all(context.dirty.map((status) =>
      context.saveOperations.current.get(status.path)?.() ?? Promise.resolve(false)));
    context.setSaving(false);
    if (!results.every(Boolean)) { context.setError("One or more pipelines could not be saved."); return; }
    const intent = context.pending; context.setPending(undefined); await context.execute(intent);
  }, [context]);
  const canSaveAll = canSaveAllDrafts(context.dirty);
  return { cancel, discard, saveAll, canSaveAll };
}
