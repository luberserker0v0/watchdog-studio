export interface ProjectSummary {
  rootPath: string;
  displayName: string;
  manifest?: ManifestSummary;
  pipelines: PipelineSummary[];
  warnings: string[];
  canInitialize: boolean;
}

export interface InitializeProjectRequest {
  projectName: string;
  projectId: string;
  version: string;
  pipelineName: string;
}

export interface ManifestSummary {
  id: string;
  name: string;
  version: string;
  hasAgent: boolean;
}

export interface PipelineSummary {
  name: string;
  pipelinePath: string;
  metadataPath: string;
  layoutPath?: string;
}
