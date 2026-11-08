import type { PipelineDocument } from "./PipelineDocument";
import type { ProjectSummary } from "./ProjectSummary";

export interface InitializedProject {
  summary: ProjectSummary;
  document: PipelineDocument;
}
