use super::contracts::{DraftValidation, PipelineDocument, SourceDiagnostic};
use super::{graph, schema};
use std::path::{Component, Path, PathBuf};

const MAX_SOURCE_BYTES: u64 = 8 * 1024 * 1024;

struct Sources {
    pipeline: String,
    metadata: String,
    layout: Option<String>,
}

pub fn load(root: &Path, pipeline_path: &str) -> Result<PipelineDocument, String> {
    let root = root.canonicalize().map_err(|error| error_at(root, error))?;
    let pipeline = resolve_pipeline(&root, pipeline_path)?;
    let sources = load_sources(&pipeline)?;
    build_document(&root, &pipeline, sources)
}

pub(crate) fn resolve_pipeline(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let pipeline = confined_file(root, relative)?;
    require_pipeline_json(&pipeline)?;
    Ok(pipeline)
}

pub fn validate_draft(
    root: &Path,
    pipeline_path: &str,
    pipeline_source: &str,
    metadata_source: &str,
    layout_source: Option<&str>,
) -> Result<DraftValidation, String> {
    enforce_source_limit(pipeline_source)?;
    enforce_source_limit(metadata_source)?;
    if let Some(source) = layout_source {
        enforce_source_limit(source)?;
    }
    let root = root.canonicalize().map_err(|error| error_at(root, error))?;
    let pipeline = confined_file(&root, pipeline_path)?;
    let mut sources = load_sources(&pipeline)?;
    sources.pipeline = pipeline_source.to_string();
    sources.metadata = metadata_source.to_string();
    sources.layout = layout_source.map(str::to_string);
    let (diagnostics, graph) = validate_document(&pipeline, &sources);
    Ok(DraftValidation { diagnostics, graph })
}

fn load_sources(pipeline: &Path) -> Result<Sources, String> {
    let stem = pipeline_stem(pipeline)?;
    let metadata = pipeline.with_file_name(format!("{stem}.meta.json"));
    let layout = pipeline.with_file_name(format!("{stem}.layout.json"));
    Ok(Sources {
        pipeline: read_source(pipeline)?,
        metadata: read_source(&metadata)?,
        layout: layout.is_file().then(|| read_source(&layout)).transpose()?,
    })
}

fn build_document(
    root: &Path,
    pipeline: &Path,
    sources: Sources,
) -> Result<PipelineDocument, String> {
    let (diagnostics, graph) = validate_document(pipeline, &sources);
    document(root, pipeline, sources, diagnostics, graph)
}

fn validate_document(
    pipeline: &Path,
    sources: &Sources,
) -> (
    Vec<SourceDiagnostic>,
    Option<super::contracts::NormalizedGraph>,
) {
    let stem = pipeline_stem(pipeline).unwrap_or("pipeline");
    let metadata = pipeline.with_file_name(format!("{stem}.meta.json"));
    let layout = pipeline.with_file_name(format!("{stem}.layout.json"));
    let mut diagnostics = validate_sources(
        &metadata,
        &sources.metadata,
        pipeline,
        &sources.pipeline,
        &layout,
        sources.layout.as_deref(),
    );
    let (graph, graph_diagnostics) = graph::normalize(graph::GraphSources {
        pipeline: &sources.pipeline,
        metadata: &sources.metadata,
        layout: sources.layout.as_deref(),
        pipeline_file: &display_name(pipeline),
        layout_file: &display_name(&layout),
    });
    diagnostics.extend(graph_diagnostics);
    (diagnostics, graph)
}

fn confined_file(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let relative = Path::new(relative);
    if relative.is_absolute() || relative.components().any(forbidden_component) {
        return Err("Pipeline path must be a confined relative path".into());
    }
    reject_link_chain(root, relative)?;
    let path = root.join(relative);
    reject_link(&path)?;
    let resolved = path
        .canonicalize()
        .map_err(|error| error_at(&path, error))?;
    resolved
        .starts_with(root)
        .then_some(resolved)
        .ok_or_else(|| "Pipeline path escapes the selected project".into())
}

fn reject_link_chain(root: &Path, relative: &Path) -> Result<(), String> {
    let mut current = root.to_path_buf();
    for component in relative.components() {
        let Component::Normal(name) = component else {
            continue;
        };
        current.push(name);
        let metadata =
            std::fs::symlink_metadata(&current).map_err(|error| error_at(&current, error))?;
        if metadata.file_type().is_symlink() {
            return Err(format!(
                "Pipeline path contains a symbolic link: {}",
                current.display()
            ));
        }
    }
    Ok(())
}

fn forbidden_component(component: Component<'_>) -> bool {
    matches!(
        component,
        Component::ParentDir | Component::RootDir | Component::Prefix(_)
    )
}

fn reject_link(path: &Path) -> Result<(), String> {
    let metadata = std::fs::symlink_metadata(path).map_err(|error| error_at(path, error))?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err(format!(
            "Pipeline source is not a regular file: {}",
            path.display()
        ));
    }
    Ok(())
}

fn require_pipeline_json(path: &Path) -> Result<(), String> {
    path.file_name()
        .and_then(|value| value.to_str())
        .is_some_and(|value| value.ends_with(".pipeline.json"))
        .then_some(())
        .ok_or_else(|| "Pipeline source must use the .pipeline.json suffix".into())
}

fn pipeline_stem(path: &Path) -> Result<&str, String> {
    path.file_name()
        .and_then(|value| value.to_str())
        .and_then(|value| value.strip_suffix(".pipeline.json"))
        .ok_or_else(|| format!("Invalid pipeline filename: {}", path.display()))
}

fn read_source(path: &Path) -> Result<String, String> {
    reject_link(path)?;
    let size = path
        .metadata()
        .map_err(|error| error_at(path, error))?
        .len();
    if size > MAX_SOURCE_BYTES {
        return Err(format!("Pipeline source exceeds 8 MiB: {}", path.display()));
    }
    std::fs::read_to_string(path).map_err(|error| error_at(path, error))
}

fn enforce_source_limit(source: &str) -> Result<(), String> {
    (source.len() as u64 <= MAX_SOURCE_BYTES)
        .then_some(())
        .ok_or_else(|| "Metadata draft exceeds 8 MiB".into())
}

fn validate_sources(
    metadata: &Path,
    metadata_source: &str,
    pipeline: &Path,
    pipeline_source: &str,
    layout: &Path,
    layout_source: Option<&str>,
) -> Vec<SourceDiagnostic> {
    let mut diagnostics = schema::validate_metadata(metadata_source, &display_name(metadata));
    diagnostics.extend(schema::validate_pipeline(
        pipeline_source,
        &display_name(pipeline),
    ));
    if let Some(source) = layout_source {
        diagnostics.extend(schema::validate_layout(source, &display_name(layout)));
    }
    diagnostics
}

fn document(
    root: &Path,
    pipeline: &Path,
    sources: Sources,
    diagnostics: Vec<SourceDiagnostic>,
    graph: Option<super::contracts::NormalizedGraph>,
) -> Result<PipelineDocument, String> {
    Ok(PipelineDocument {
        name: pipeline_stem(pipeline)?.to_string(),
        pipeline_path: relative(root, pipeline)?,
        pipeline_source: sources.pipeline,
        metadata_source: sources.metadata,
        layout_source: sources.layout,
        diagnostics,
        specification: schema::specification()?,
        graph,
    })
}

fn relative(root: &Path, path: &Path) -> Result<String, String> {
    path.strip_prefix(root)
        .map(|value| value.to_string_lossy().replace('\\', "/"))
        .map_err(|_| format!("Path escapes project root: {}", path.display()))
}

fn display_name(path: &Path) -> String {
    path.file_name()
        .map(|value| value.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.display().to_string())
}

fn error_at(path: &Path, error: std::io::Error) -> String {
    format!("Failed to read {}: {error}", path.display())
}

#[cfg(test)]
mod tests {
    use super::{load, validate_draft};
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn loads_sources_and_pinned_specification() {
        let directory = project(r#"{"nodes":{"A":{"kind":"Entry"},"B":{"kind":"Endpoint"}}}"#);
        fs::write(directory.path().join("demo.layout.json"), r#"{"nodes":{}}"#).unwrap();
        let document = load(directory.path(), "demo.pipeline.json").unwrap();
        assert!(document.diagnostics.is_empty());
        assert_eq!(document.specification.automation_version, "2.0.0");
        assert!(document.layout_source.is_some());
    }

    #[test]
    fn returns_pipeline_schema_diagnostics_with_source_identity() {
        let directory = project(r#"{"nodes":{"A":{"kind":"Entry"},"B":{"kind":"Endpoint"}}}"#);
        fs::write(
            directory.path().join("demo.pipeline.json"),
            r#"{"instances":{"A":{"node":"A","unknown":true}}}"#,
        )
        .unwrap();
        let document = load(directory.path(), "demo.pipeline.json").unwrap();
        assert!(
            document
                .diagnostics
                .iter()
                .any(|item| item.file == "demo.pipeline.json")
        );
    }

    #[test]
    fn rejects_parent_directory_traversal() {
        let directory = tempdir().unwrap();
        let error = load(directory.path(), "../outside.pipeline.json").unwrap_err();
        assert!(error.contains("confined relative path"));
    }

    #[test]
    fn validates_unsaved_sources_and_layout() {
        let directory = project(r#"{"nodes":{"A":{"kind":"Entry"},"B":{"kind":"Endpoint"}}}"#);
        let result = validate_draft(
            directory.path(),
            "demo.pipeline.json",
            r#"{"instances":{"A":{"node":"A","next":["B"]},"B":{"node":"B"}}}"#,
            r#"{"nodes":{"A":{"kind":"Entry","timeout":-1},"B":{"kind":"Endpoint"}}}"#,
            Some(r#"{"nodes":{"A":{"x":"left","y":20}}}"#),
        )
        .unwrap();
        assert!(result.graph.is_some());
        assert!(
            result
                .diagnostics
                .iter()
                .any(|item| item.path.contains("timeout"))
        );
        assert!(
            result
                .diagnostics
                .iter()
                .any(|item| item.file == "demo.layout.json")
        );
    }

    fn project(metadata: &str) -> tempfile::TempDir {
        let directory = tempdir().unwrap();
        fs::write(
            directory.path().join("demo.pipeline.json"),
            r#"{"instances":{"A":{"node":"A","next":["B"]},"B":{"node":"B"}}}"#,
        )
        .unwrap();
        fs::write(directory.path().join("demo.meta.json"), metadata).unwrap();
        directory
    }
}
