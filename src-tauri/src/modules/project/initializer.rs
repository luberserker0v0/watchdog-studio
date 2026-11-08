use super::contracts::InitializeProjectRequest;
use serde_json::{Value, json};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

const MANIFEST_NAME: &str = "watchdog.project.json";

pub fn initialize(root: &Path, request: InitializeProjectRequest) -> Result<String, String> {
    let root = confined_empty_root(root)?;
    let values = validated(request)?;
    let relative = format!("pipelines/{0}/{0}.pipeline.json", values.pipeline_name);
    let paths = source_paths(&root, &values.pipeline_name);
    if let Err(error) = create_directories(&paths) {
        rollback(&paths);
        return Err(error);
    }
    let result = write_sources(&paths, &values);
    if result.is_err() {
        rollback(&paths);
    }
    result.map(|()| relative)
}

struct InitialValues {
    project_name: String,
    project_id: String,
    version: String,
    pipeline_name: String,
}

struct SourcePaths {
    pipelines: PathBuf,
    pipeline_dir: PathBuf,
    manifest: PathBuf,
    pipeline: PathBuf,
    metadata: PathBuf,
    layout: PathBuf,
}

fn confined_empty_root(root: &Path) -> Result<PathBuf, String> {
    let root = root.canonicalize().map_err(|error| error_at(root, error))?;
    let metadata = fs::symlink_metadata(&root).map_err(|error| error_at(&root, error))?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return Err("Project root must be a real directory".into());
    }
    let empty = fs::read_dir(&root)
        .map_err(|error| error_at(&root, error))?
        .next()
        .is_none();
    empty
        .then_some(root)
        .ok_or_else(|| "Only an empty project folder can be initialized".into())
}

fn validated(request: InitializeProjectRequest) -> Result<InitialValues, String> {
    let project_name = clean_text("Project name", request.project_name, 128)?;
    let project_id = clean_text("Project ID", request.project_id, 128)?;
    let version = clean_text("Version", request.version, 64)?;
    let pipeline_name = clean_text("Pipeline name", request.pipeline_name, 64)?;
    if !valid_project_id(&project_id) {
        return Err("Project ID contains unsupported characters".into());
    }
    if !valid_pipeline_name(&pipeline_name) {
        return Err(
            "Pipeline name must start with a letter and contain only letters, numbers, '_' or '-'"
                .into(),
        );
    }
    Ok(InitialValues {
        project_name,
        project_id,
        version,
        pipeline_name,
    })
}

fn clean_text(label: &str, value: String, limit: usize) -> Result<String, String> {
    let value = value.trim().to_string();
    if value.is_empty() || value.len() > limit || value.chars().any(char::is_control) {
        return Err(format!(
            "{label} must contain 1 to {limit} printable characters"
        ));
    }
    Ok(value)
}

fn valid_project_id(value: &str) -> bool {
    let mut chars = value.chars();
    chars
        .next()
        .is_some_and(|value| value.is_ascii_alphanumeric())
        && chars.all(|value| value.is_ascii_alphanumeric() || "._-".contains(value))
}

fn valid_pipeline_name(value: &str) -> bool {
    let mut chars = value.chars();
    chars
        .next()
        .is_some_and(|value| value.is_ascii_alphabetic())
        && chars.all(|value| value.is_ascii_alphanumeric() || "_-".contains(value))
}

fn source_paths(root: &Path, name: &str) -> SourcePaths {
    let pipelines = root.join("pipelines");
    let pipeline_dir = pipelines.join(name);
    SourcePaths {
        manifest: root.join(MANIFEST_NAME),
        pipeline: pipeline_dir.join(format!("{name}.pipeline.json")),
        metadata: pipeline_dir.join(format!("{name}.meta.json")),
        layout: pipeline_dir.join(format!("{name}.layout.json")),
        pipelines,
        pipeline_dir,
    }
}

fn create_directories(paths: &SourcePaths) -> Result<(), String> {
    fs::create_dir(&paths.pipelines).map_err(|error| error_at(&paths.pipelines, error))?;
    fs::create_dir(&paths.pipeline_dir).map_err(|error| error_at(&paths.pipeline_dir, error))
}

fn write_sources(paths: &SourcePaths, values: &InitialValues) -> Result<(), String> {
    let sources = source_values(values);
    for (path, value) in [
        (&paths.pipeline, &sources[0]),
        (&paths.metadata, &sources[1]),
        (&paths.layout, &sources[2]),
        (&paths.manifest, &sources[3]),
    ] {
        write_new_json(path, value)?;
    }
    Ok(())
}

fn source_values(values: &InitialValues) -> [Value; 4] {
    [
        json!({"instances": {
            "Entry": {"node": "Entry", "label": "Entry", "next": ["Endpoint"]},
            "Endpoint": {"node": "Endpoint", "label": "Endpoint"}
        }}),
        json!({"target": null, "launch": null, "nodes": {
            "Entry": {"kind": "Entry"}, "Endpoint": {"kind": "Endpoint"}
        }}),
        json!({"nodes": {"Entry": {"x": 80, "y": 80}, "Endpoint": {"x": 320, "y": 80}}}),
        json!({"manifest_version": 1, "id": values.project_id,
            "name": values.project_name, "version": values.version}),
    ]
}

fn write_new_json(path: &Path, value: &Value) -> Result<(), String> {
    let mut source = serde_json::to_string_pretty(value).map_err(|error| error.to_string())?;
    source.push('\n');
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
        .map_err(|error| error_at(path, error))?;
    file.write_all(source.as_bytes())
        .and_then(|()| file.sync_all())
        .map_err(|error| error_at(path, error))
}

fn rollback(paths: &SourcePaths) {
    for path in [
        &paths.manifest,
        &paths.pipeline,
        &paths.metadata,
        &paths.layout,
    ] {
        let _ = fs::remove_file(path);
    }
    let _ = fs::remove_dir(&paths.pipeline_dir);
    let _ = fs::remove_dir(&paths.pipelines);
}

fn error_at(path: &Path, error: std::io::Error) -> String {
    format!("Failed to initialize {}: {error}", path.display())
}

#[cfg(test)]
mod tests {
    use super::initialize;
    use crate::modules::project::contracts::InitializeProjectRequest;
    use crate::modules::project::{loader, service};
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn creates_a_valid_entry_to_endpoint_project() {
        let directory = tempdir().unwrap();
        let path = initialize(directory.path(), request("demo")).unwrap();
        let document = loader::load(directory.path(), &path).unwrap();
        let (_, summary) = service::open(directory.path()).unwrap();

        assert!(document.diagnostics.is_empty());
        assert_eq!(document.graph.unwrap().edges.len(), 1);
        assert_eq!(summary.pipelines.len(), 1);
        assert!(!summary.can_initialize);
    }

    #[test]
    fn rejects_non_empty_folders_without_overwriting_them() {
        let directory = tempdir().unwrap();
        let existing = directory.path().join("notes.txt");
        fs::write(&existing, "keep").unwrap();

        let error = initialize(directory.path(), request("demo")).unwrap_err();

        assert!(error.contains("empty"));
        assert_eq!(fs::read_to_string(existing).unwrap(), "keep");
    }

    #[test]
    fn rejects_unsafe_pipeline_names() {
        let directory = tempdir().unwrap();
        let error = initialize(directory.path(), request("../escape")).unwrap_err();
        assert!(error.contains("Pipeline name"));
        assert!(fs::read_dir(directory.path()).unwrap().next().is_none());
    }

    fn request(pipeline_name: &str) -> InitializeProjectRequest {
        InitializeProjectRequest {
            project_name: "Demo".into(),
            project_id: "demo.project".into(),
            version: "0.1.0".into(),
            pipeline_name: pipeline_name.into(),
        }
    }
}
