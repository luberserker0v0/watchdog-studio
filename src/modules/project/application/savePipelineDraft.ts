import { invoke } from "@tauri-apps/api/core";
import type { PipelineDocument } from "../contracts/PipelineDocument";

export interface SavePipelineDraftRequest {
  pipelinePath: string;
  expectedPipelineSource: string;
  expectedMetadataSource: string;
  expectedLayoutSource?: string;
  pipelineSource: string;
  metadataSource: string;
  layoutSource?: string;
}

export function savePipelineDraft(
  request: SavePipelineDraftRequest,
): Promise<PipelineDocument> {
  return invoke<PipelineDocument>("save_pipeline_draft", { request });
}
