use super::contracts::ProjectSummary;
use super::{manifest, scanner};
use std::path::{Path, PathBuf};

pub fn open(path: &Path) -> Result<(PathBuf, ProjectSummary), String> {
    reject_selected_link(path)?;
    let root = path
        .canonicalize()
        .map_err(|error| format!("Failed to resolve {}: {error}", path.display()))?;
    if !root.is_dir() {
        return Err("Selected project path is not a directory".into());
    }
    let manifest = manifest::read(&root)?;
    let scanned = scanner::scan(&root)?;
    let can_initialize = manifest.is_none() && scanned.is_empty;
    let display_name = manifest
        .as_ref()
        .map(|value| value.name.clone())
        .or_else(|| {
            root.file_name()
                .map(|value| value.to_string_lossy().into_owned())
        })
        .unwrap_or_else(|| "WatchDog project".into());
    let summary = ProjectSummary {
        root_path: display_path(&root),
        display_name,
        manifest,
        pipelines: scanned.pipelines,
        warnings: scanned.warnings,
        can_initialize,
    };
    Ok((root, summary))
}

fn display_path(path: &Path) -> String {
    let value = path.to_string_lossy();
    if let Some(unc) = value.strip_prefix(r"\\?\UNC\") {
        return format!(r"\\{unc}");
    }
    value.strip_prefix(r"\\?\").unwrap_or(&value).to_string()
}

fn reject_selected_link(path: &Path) -> Result<(), String> {
    let metadata = std::fs::symlink_metadata(path)
        .map_err(|error| format!("Failed to inspect {}: {error}", path.display()))?;
    (!metadata.file_type().is_symlink())
        .then_some(())
        .ok_or_else(|| "Select the real project directory, not a symbolic link".into())
}

#[cfg(test)]
mod tests {
    use super::open;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn discovers_nested_pipeline_source_set_and_layout() {
        let directory = tempdir().expect("temporary project");
        let nested = directory.path().join("pipelines");
        fs::create_dir(&nested).expect("pipeline directory");
        write_pipeline(&nested, "login", true);

        let (_, summary) = open(directory.path()).expect("project summary");

        assert_eq!(summary.pipelines.len(), 1);
        assert_eq!(
            summary.pipelines[0].pipeline_path,
            "pipelines/login.pipeline.json"
        );
        assert_eq!(
            summary.pipelines[0].layout_path.as_deref(),
            Some("pipelines/login.layout.json")
        );
    }

    #[test]
    fn ignores_unrelated_markdown() {
        let directory = tempdir().expect("temporary project");
        fs::write(directory.path().join("notes.md"), "# Notes").expect("notes");

        let (_, summary) = open(directory.path()).expect("project summary");

        assert!(summary.pipelines.is_empty());
        assert!(!summary.can_initialize);
    }

    #[test]
    fn marks_a_truly_empty_folder_as_initializable() {
        let directory = tempdir().expect("temporary project");
        let (_, summary) = open(directory.path()).expect("project summary");
        assert!(summary.can_initialize);
    }

    #[test]
    fn ignores_pipeline_without_metadata_source() {
        let directory = tempdir().expect("temporary project");
        fs::write(
            directory.path().join("demo.pipeline.json"),
            r#"{"instances":{}}"#,
        )
        .expect("pipeline");

        let (_, summary) = open(directory.path()).expect("project summary");

        assert!(summary.pipelines.is_empty());
    }

    #[test]
    fn rejects_manifest_without_required_fields() {
        let directory = tempdir().expect("temporary project");
        fs::write(
            directory.path().join("watchdog.project.json"),
            r#"{"name":"Demo"}"#,
        )
        .expect("manifest");

        let error = open(directory.path()).expect_err("invalid manifest");

        assert!(error.contains("field 'id'"));
    }

    fn write_pipeline(directory: &std::path::Path, name: &str, layout: bool) {
        fs::write(
            directory.join(format!("{name}.pipeline.json")),
            r#"{"instances":{}}"#,
        )
        .expect("pipeline");
        fs::write(directory.join(format!("{name}.meta.json")), "{}").expect("metadata");
        if layout {
            fs::write(directory.join(format!("{name}.layout.json")), "{}").expect("layout");
        }
    }
}
