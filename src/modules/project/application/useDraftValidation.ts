import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type {
  DraftValidation, NormalizedGraph, PipelineDocument, SourceDiagnostic,
} from "../contracts/PipelineDocument";
import { validatePipelineDraft } from "./loadPipeline";

interface ValidationSources {
  pipelineSource: string;
  metadataSource: string;
  layoutSource?: string;
}

interface ValidationState extends ValidationSources {
  result?: DraftValidation;
  error?: string;
}

interface DraftValidationView {
  diagnostics: SourceDiagnostic[];
  graph?: NormalizedGraph;
  pending: boolean;
  error?: string;
}

export function useDraftValidation(
  document: PipelineDocument,
  pipelineSource: string,
  metadataSource: string,
  layoutSource?: string,
): DraftValidationView {
  const originalSources = sourcesFrom(document);
  const [state, setState] = useState<ValidationState>(originalSources);
  const draft = { pipelineSource, metadataSource, layoutSource };
  const original = sameSources(draft, originalSources);
  useValidationEffect(document.pipelinePath, draft, original, setState);
  if (original) return originalValidation(document);
  if (sameSources(state, draft)) return currentValidation(document, state);
  return { diagnostics: [], graph: document.graph, pending: true };
}

function useValidationEffect(
  pipelinePath: string,
  draft: ValidationSources,
  original: boolean,
  setState: Dispatch<SetStateAction<ValidationState>>,
) {
  const { pipelineSource, metadataSource, layoutSource } = draft;
  useEffect(() => {
    if (original) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      const sources = { pipelineSource, metadataSource, layoutSource };
      const next = await requestValidation(pipelinePath, sources);
      if (active) setState({ ...sources, ...next });
    }, 200);
    return () => { active = false; window.clearTimeout(timer); };
  }, [layoutSource, metadataSource, original, pipelinePath, pipelineSource, setState]);
}

function sourcesFrom(document: PipelineDocument): ValidationSources {
  return {
    pipelineSource: document.pipelineSource,
    metadataSource: document.metadataSource,
    layoutSource: document.layoutSource,
  };
}

function sameSources(left: ValidationSources, right: ValidationSources): boolean {
  return left.pipelineSource === right.pipelineSource
    && left.metadataSource === right.metadataSource
    && left.layoutSource === right.layoutSource;
}

function currentValidation(document: PipelineDocument, state: ValidationState): DraftValidationView {
  return {
    diagnostics: state.result?.diagnostics ?? [],
    graph: state.result?.graph ?? document.graph,
    error: state.error,
    pending: false,
  };
}

async function requestValidation(pipelinePath: string, draft: ValidationSources) {
  try {
    return {
      result: await validatePipelineDraft(
        pipelinePath, draft.pipelineSource, draft.metadataSource, draft.layoutSource,
      ),
    };
  } catch (error) {
    return { error: String(error) };
  }
}

function originalValidation(document: PipelineDocument) {
  return { diagnostics: document.diagnostics, graph: document.graph, pending: false };
}
