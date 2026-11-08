export interface PipelineDraftStatus {
  path: string;
  name: string;
  dirty: boolean;
  canSave: boolean;
  saving: boolean;
}

export type SavePipelineSession = () => Promise<boolean>;
