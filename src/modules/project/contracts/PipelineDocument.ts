export interface PipelineDocument {
  name: string;
  pipelinePath: string;
  pipelineSource: string;
  metadataSource: string;
  layoutSource?: string;
  diagnostics: SourceDiagnostic[];
  specification: SpecificationVersion;
  graph?: NormalizedGraph;
}

export interface DraftValidation {
  diagnostics: SourceDiagnostic[];
  graph?: NormalizedGraph;
}

export interface NormalizedGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  label: string;
  kind: string;
  metadataKey?: string;
  metadataSource: string;
  effectiveConfig: Record<string, unknown>;
  instanceConfig?: Record<string, unknown>;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: GraphEdgeKind;
}

export type GraphEdgeKind = "Next" | "Error";

export interface SourceDiagnostic {
  file: string;
  path: string;
  message: string;
}

export interface SpecificationVersion {
  automationVersion: string;
  automationCommit: string;
  jsonSchemaDraft: string;
}
