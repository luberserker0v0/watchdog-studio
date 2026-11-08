import type { PipelineDraftStatus } from "../contracts/ProjectDocumentSession";

export function dirtyDrafts(statuses: Record<string, PipelineDraftStatus>) {
  return Object.values(statuses).filter((status) => status.dirty);
}

export function canSaveAllDrafts(statuses: PipelineDraftStatus[]) {
  return statuses.length > 0
    && statuses.every((status) => status.canSave && !status.saving);
}

export function draftCanSave(input: {
  dirty: boolean; saving: boolean; debugPending: boolean; debugStale: boolean;
  debugError?: string; diagnosticCount: number;
}) {
  return input.dirty && !input.saving && !input.debugPending && !input.debugStale
    && !input.debugError && input.diagnosticCount === 0;
}
