import { invoke } from "@tauri-apps/api/core";
import type { DraftValidation, PipelineDocument } from "../contracts/PipelineDocument";

export function loadPipeline(pipelinePath: string): Promise<PipelineDocument> {
  return invoke<PipelineDocument>("load_pipeline", { pipelinePath });
}

export function validatePipelineDraft(
  pipelinePath: string,
  pipelineSource: string,
  metadataSource: string,
  layoutSource?: string,
): Promise<DraftValidation> {
  return invoke<DraftValidation>("validate_pipeline_draft", {
    pipelinePath, pipelineSource, metadataSource, layoutSource,
  });
}
