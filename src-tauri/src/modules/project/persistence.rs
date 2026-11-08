use super::contracts::{DraftValidation, PipelineDocument, SavePipelineDraftRequest};
use super::loader;
use std::io::Write;
use std::path::{Path, PathBuf};

struct StagedSource {
    target: PathBuf,
    original: String,
    temporary: tempfile::NamedTempFile,
}

pub fn save(root: &Path, request: SavePipelineDraftRequest) -> Result<PipelineDocument, String> {
    let root = root
        .canonicalize()
        .map_err(|error| format!("Failed to resolve {}: {error}", root.display()))?;
    ensure_expected(&root, &request)?;
    let validation = loader::validate_draft(
        &root,
        &request.pipeline_path,
        &request.pipeline_source,
        &request.metadata_source,
        request.layout_source.as_deref(),
    )?;
    reject_invalid(&validation)?;
    ensure_expected(&root, &request)?;
    let pipeline = loader::resolve_pipeline(&root, &request.pipeline_path)?;
    let staged = stage_changed_sources(&pipeline, &request)?;
    commit_sources(staged)?;
    loader::load(&root, &request.pipeline_path)
}

fn ensure_expected(root: &Path, request: &SavePipelineDraftRequest) -> Result<(), String> {
    let current = loader::load(root, &request.pipeline_path)?;
    let matches = current.pipeline_source == request.expected_pipeline_source
        && current.metadata_source == request.expected_metadata_source
        && current.layout_source == request.expected_layout_source;
    matches
        .then_some(())
        .ok_or_else(|| "Pipeline sources changed outside this editor. Reload before saving.".into())
}

fn reject_invalid(validation: &DraftValidation) -> Result<(), String> {
    if validation.diagnostics.is_empty() {
        return Ok(());
    }
    let details = validation
        .diagnostics
        .iter()
        .map(|item| format!("{} {}: {}", item.file, item.path, item.message))
        .collect::<Vec<_>>()
        .join("\n");
    Err(format!("Cannot save an invalid pipeline draft:\n{details}"))
}

fn stage_changed_sources(
    pipeline: &Path,
    request: &SavePipelineDraftRequest,
) -> Result<Vec<StagedSource>, String> {
    let (metadata, layout) = sibling_paths(pipeline)?;
    let mut staged = Vec::new();
    stage_primary_sources(&mut staged, pipeline, metadata, request)?;
    stage_optional_source(
        &mut staged,
        layout,
        request.expected_layout_source.as_deref(),
        request.layout_source.as_deref(),
    )?;
    Ok(staged)
}

fn sibling_paths(pipeline: &Path) -> Result<(PathBuf, PathBuf), String> {
    let filename = pipeline
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| format!("Invalid pipeline filename: {}", pipeline.display()))?;
    let stem = filename
        .strip_suffix(".pipeline.json")
        .ok_or_else(|| format!("Invalid pipeline filename: {}", pipeline.display()))?;
    let metadata = pipeline.with_file_name(format!("{stem}.meta.json"));
    let layout = pipeline.with_file_name(format!("{stem}.layout.json"));
    Ok((metadata, layout))
}

fn stage_primary_sources(
    staged: &mut Vec<StagedSource>,
    pipeline: &Path,
    metadata: PathBuf,
    request: &SavePipelineDraftRequest,
) -> Result<(), String> {
    stage_if_changed(
        staged,
        pipeline.to_path_buf(),
        &request.expected_pipeline_source,
        &request.pipeline_source,
    )?;
    stage_if_changed(
        staged,
        metadata,
        &request.expected_metadata_source,
        &request.metadata_source,
    )
}

fn stage_optional_source(
    staged: &mut Vec<StagedSource>,
    target: PathBuf,
    original: Option<&str>,
    draft: Option<&str>,
) -> Result<(), String> {
    if original == draft {
        return Ok(());
    }
    let draft = draft.ok_or("Deleting a layout source is not supported")?;
    staged.push(stage_source(target, original.unwrap_or_default(), draft)?);
    Ok(())
}

fn stage_if_changed(
    staged: &mut Vec<StagedSource>,
    target: PathBuf,
    original: &str,
    draft: &str,
) -> Result<(), String> {
    if original == draft {
        return Ok(());
    }
    staged.push(stage_source(target, original, draft)?);
    Ok(())
}

fn stage_source(target: PathBuf, original: &str, draft: &str) -> Result<StagedSource, String> {
    let parent = target
        .parent()
        .ok_or("Pipeline source has no parent directory")?;
    let mut temporary = tempfile::NamedTempFile::new_in(parent)
        .map_err(|error| format!("Failed to stage {}: {error}", target.display()))?;
    temporary
        .write_all(draft.as_bytes())
        .and_then(|_| temporary.as_file().sync_all())
        .map_err(|error| format!("Failed to stage {}: {error}", target.display()))?;
    Ok(StagedSource {
        target,
        original: original.into(),
        temporary,
    })
}

fn commit_sources(staged: Vec<StagedSource>) -> Result<(), String> {
    let mut committed = Vec::new();
    for source in staged {
        let target = source.target.clone();
        let original = source.original.clone();
        if let Err(error) = source.temporary.persist(&target) {
            return rollback_after_error(committed, &target, error.error);
        }
        committed.push((target, original));
    }
    Ok(())
}

fn rollback_after_error(
    committed: Vec<(PathBuf, String)>,
    failed: &Path,
    error: std::io::Error,
) -> Result<(), String> {
    let failure = format!("Failed to replace {}: {error}", failed.display());
    for (target, original) in committed.into_iter().rev() {
        if let Err(rollback) = replace_source(&target, &original) {
            return Err(format!("{failure}; rollback also failed: {rollback}"));
        }
    }
    Err(failure)
}

fn replace_source(target: &Path, content: &str) -> Result<(), String> {
    let parent = target
        .parent()
        .ok_or("Pipeline source has no parent directory")?;
    let mut temporary = tempfile::NamedTempFile::new_in(parent)
        .map_err(|error| format!("Failed to stage rollback: {error}"))?;
    temporary
        .write_all(content.as_bytes())
        .and_then(|_| temporary.as_file().sync_all())
        .map_err(|error| format!("Failed to stage rollback: {error}"))?;
    temporary
        .persist(target)
        .map(|_| ())
        .map_err(|error| format!("Failed to restore {}: {}", target.display(), error.error))
}

#[cfg(test)]
mod tests {
    use super::save;
    use crate::modules::project::contracts::SavePipelineDraftRequest;
    use std::fs;

    #[test]
    fn saves_and_reloads_all_editable_sources() {
        let project = fixture();
        let mut request = request();
        request.pipeline_source = r#"{"instances":{"A":{"node":"A","enabled":false}}}"#.into();
        request.metadata_source = r#"{"nodes":{"A":{"timeout":9}}}"#.into();
        request.layout_source = Some(r#"{"nodes":{"A":{"x":20,"y":40}}}"#.into());

        let saved = save(project.path(), request).expect("saved document");

        assert!(saved.pipeline_source.contains("\"enabled\":false"));
        assert!(saved.metadata_source.contains("\"timeout\":9"));
        assert!(saved.layout_source.unwrap().contains("\"x\":20"));
    }

    #[test]
    fn rejects_external_changes_without_overwriting_them() {
        let project = fixture();
        fs::write(
            project.path().join("demo.meta.json"),
            r#"{"nodes":{"A":{"timeout":7}}}"#,
        )
        .expect("external edit");

        let error = save(project.path(), request()).expect_err("conflict");

        assert!(error.contains("changed outside this editor"));
        assert!(
            fs::read_to_string(project.path().join("demo.meta.json"))
                .unwrap()
                .contains('7')
        );
    }

    #[test]
    fn rejects_invalid_drafts_without_writing() {
        let project = fixture();
        let mut request = request();
        request.pipeline_source = r#"{"instances":{"A":{"node":"Missing"}}}"#.into();

        let error = save(project.path(), request).expect_err("invalid draft");

        assert!(error.contains("Cannot save an invalid pipeline draft"));
        assert_eq!(
            fs::read_to_string(project.path().join("demo.pipeline.json")).unwrap(),
            pipeline()
        );
    }

    #[test]
    fn rejects_invalid_pipeline_routing_without_writing() {
        let project = fixture();
        let mut request = request();
        request.pipeline_source = r#"{"instances":{"A":{"node":"A","next":["A"]}}}"#.into();

        let error = save(project.path(), request).expect_err("invalid routing");

        assert!(error.contains("contains a cycle"));
        assert_eq!(
            fs::read_to_string(project.path().join("demo.pipeline.json")).unwrap(),
            pipeline()
        );
    }

    fn fixture() -> tempfile::TempDir {
        let project = tempfile::tempdir().expect("temporary project");
        fs::write(project.path().join("demo.pipeline.json"), pipeline()).expect("pipeline");
        fs::write(project.path().join("demo.meta.json"), metadata()).expect("metadata");
        project
    }

    fn request() -> SavePipelineDraftRequest {
        SavePipelineDraftRequest {
            pipeline_path: "demo.pipeline.json".into(),
            expected_pipeline_source: pipeline().into(),
            expected_metadata_source: metadata().into(),
            expected_layout_source: None,
            pipeline_source: pipeline().into(),
            metadata_source: metadata().into(),
            layout_source: None,
        }
    }

    fn metadata() -> &'static str {
        r#"{"nodes":{"A":{}}}"#
    }
    fn pipeline() -> &'static str {
        r#"{"instances":{"A":{"node":"A"}}}"#
    }
}
