mod metadata;
mod validation;

use super::contracts::{NormalizedGraph, SourceDiagnostic};

pub struct GraphSources<'a> {
    pub pipeline: &'a str,
    pub metadata: &'a str,
    pub layout: Option<&'a str>,
    pub pipeline_file: &'a str,
    pub layout_file: &'a str,
}

pub fn normalize(sources: GraphSources<'_>) -> (Option<NormalizedGraph>, Vec<SourceDiagnostic>) {
    let (graph, mut diagnostics) =
        metadata::resolve(sources.pipeline, sources.metadata, sources.pipeline_file);
    diagnostics.extend(metadata::validate_layout(
        &graph,
        sources.layout,
        sources.layout_file,
    ));
    diagnostics.extend(validation::validate(&graph, sources.pipeline_file));
    (Some(graph), diagnostics)
}

pub(super) fn diagnostic(file: &str, path: &str, message: String) -> SourceDiagnostic {
    SourceDiagnostic {
        file: file.to_string(),
        path: path.to_string(),
        message,
    }
}
