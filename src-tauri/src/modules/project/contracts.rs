use serde::Serialize;

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavePipelineDraftRequest {
    pub pipeline_path: String,
    pub expected_pipeline_source: String,
    pub expected_metadata_source: String,
    pub expected_layout_source: Option<String>,
    pub pipeline_source: String,
    pub metadata_source: String,
    pub layout_source: Option<String>,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitializeProjectRequest {
    pub project_name: String,
    pub project_id: String,
    pub version: String,
    pub pipeline_name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSummary {
    pub root_path: String,
    pub display_name: String,
    pub manifest: Option<ManifestSummary>,
    pub pipelines: Vec<PipelineSummary>,
    pub warnings: Vec<String>,
    pub can_initialize: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InitializedProject {
    pub summary: ProjectSummary,
    pub document: PipelineDocument,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestSummary {
    pub id: String,
    pub name: String,
    pub version: String,
    pub has_agent: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PipelineSummary {
    pub name: String,
    pub pipeline_path: String,
    pub metadata_path: String,
    pub layout_path: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PipelineDocument {
    pub name: String,
    pub pipeline_path: String,
    pub pipeline_source: String,
    pub metadata_source: String,
    pub layout_source: Option<String>,
    pub diagnostics: Vec<SourceDiagnostic>,
    pub specification: SpecificationVersion,
    pub graph: Option<NormalizedGraph>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DraftValidation {
    pub diagnostics: Vec<SourceDiagnostic>,
    pub graph: Option<NormalizedGraph>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedGraph {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GraphNode {
    pub id: String,
    pub label: String,
    pub kind: String,
    pub metadata_key: Option<String>,
    pub metadata_source: String,
    pub effective_config: serde_json::Value,
    pub instance_config: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GraphEdge {
    pub from: String,
    pub to: String,
    pub kind: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SourceDiagnostic {
    pub file: String,
    pub path: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecificationVersion {
    pub automation_version: String,
    pub automation_commit: String,
    pub json_schema_draft: String,
}
