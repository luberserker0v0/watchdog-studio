import { useState } from "react";
import type { PipelineDocument } from "../contracts/PipelineDocument";
import { savePipelineDraft } from "./savePipelineDraft";

interface DraftSources {
  pipelineSource: string;
  metadataSource: string;
  layoutSource?: string;
  acceptSaved: (document: PipelineDocument) => void;
}

export function useDraftPersistence(
  document: PipelineDocument,
  draft: DraftSources,
  onSaved: (document: PipelineDocument) => void,
) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const save = async () => {
    setSaving(true);
    setError(undefined);
    try {
      const saved = await savePipelineDraft(requestFor(document, draft));
      draft.acceptSaved(saved);
      onSaved(saved);
      return true;
    } catch (reason) {
      setError(String(reason));
      return false;
    } finally {
      setSaving(false);
    }
  };
  return { save, saving, error };
}

function requestFor(document: PipelineDocument, draft: DraftSources) {
  return {
    pipelinePath: document.pipelinePath,
    expectedPipelineSource: document.pipelineSource,
    expectedMetadataSource: document.metadataSource,
    expectedLayoutSource: document.layoutSource,
    pipelineSource: draft.pipelineSource,
    metadataSource: draft.metadataSource,
    layoutSource: draft.layoutSource,
  };
}
