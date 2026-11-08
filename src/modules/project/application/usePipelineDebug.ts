import { useState } from "react";
import type {
  DraftValidation, PipelineDocument, SourceDiagnostic,
} from "../contracts/PipelineDocument";
import { validatePipelineDraft } from "./loadPipeline";

export interface DebugEntry {
  id: string;
  level: "success" | "error" | "info";
  title: string;
  detail: string;
  time: string;
}

interface Sources {
  pipelineSource: string;
  metadataSource: string;
  layoutSource?: string;
}

export function usePipelineDebug(document: PipelineDocument, sources: Sources) {
  const [result, setResult] = useState<DraftValidation>(initialResult(document));
  const [validated, setValidated] = useState<Sources>(sources);
  const [entries, setEntries] = useState<DebugEntry[]>(() => initialEntries(document));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const run = async () => runDebug(document.pipelinePath, sources, {
    setResult, setValidated, setEntries, setPending, setError,
  });
  return {
    diagnostics: result.diagnostics, graph: result.graph ?? document.graph,
    entries, pending, error, stale: !sameSources(sources, validated), run,
    clear: () => setEntries([]),
  };
}

async function runDebug(path: string, sources: Sources, setters: DebugSetters) {
  setters.setPending(true);
  setters.setError(undefined);
  try {
    const result = await validatePipelineDraft(
      path, sources.pipelineSource, sources.metadataSource, sources.layoutSource,
    );
    setters.setResult(result);
    setters.setValidated(sources);
    setters.setEntries((current) => [...current, ...resultEntries(result)]);
  } catch (reason) {
    const message = String(reason);
    setters.setError(message);
    setters.setEntries((current) => [...current, entry("error", "Debug failed", message)]);
  } finally {
    setters.setPending(false);
  }
}

function initialResult(document: PipelineDocument): DraftValidation {
  return { diagnostics: document.diagnostics, graph: document.graph };
}

function initialEntries(document: PipelineDocument): DebugEntry[] {
  return resultEntries(initialResult(document), "Loaded pipeline");
}

function resultEntries(result: DraftValidation, title = "Debug complete"): DebugEntry[] {
  if (!result.diagnostics.length) return [entry("success", title, "No diagnostics.")];
  return result.diagnostics.map(diagnosticEntry);
}

function diagnosticEntry(diagnostic: SourceDiagnostic): DebugEntry {
  return entry("error", `${diagnostic.file}${diagnostic.path}`, diagnostic.message);
}

function entry(level: DebugEntry["level"], title: string, detail: string): DebugEntry {
  return { id: crypto.randomUUID(), level, title, detail, time: new Date().toLocaleTimeString() };
}

function sameSources(left: Sources, right: Sources): boolean {
  return left.pipelineSource === right.pipelineSource
    && left.metadataSource === right.metadataSource
    && left.layoutSource === right.layoutSource;
}

interface DebugSetters {
  setResult: React.Dispatch<React.SetStateAction<DraftValidation>>;
  setValidated: React.Dispatch<React.SetStateAction<Sources>>;
  setEntries: React.Dispatch<React.SetStateAction<DebugEntry[]>>;
  setPending: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | undefined>>;
}
