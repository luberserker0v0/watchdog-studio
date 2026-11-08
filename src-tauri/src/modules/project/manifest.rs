use super::contracts::ManifestSummary;
use serde_json::Value;
use std::path::Path;

const MANIFEST_NAME: &str = "watchdog.project.json";
const MAX_MANIFEST_BYTES: u64 = 1_048_576;

pub fn read(root: &Path) -> Result<Option<ManifestSummary>, String> {
    let path = root.join(MANIFEST_NAME);
    if !path.exists() {
        return Ok(None);
    }
    reject_link(&path)?;
    let metadata = path.metadata().map_err(|error| error_at(&path, error))?;
    if !metadata.is_file() || metadata.len() > MAX_MANIFEST_BYTES {
        return Err("Project manifest must be a regular file smaller than 1 MiB".into());
    }
    parse(&path).map(Some)
}

fn parse(path: &Path) -> Result<ManifestSummary, String> {
    let source = std::fs::read_to_string(path).map_err(|error| error_at(path, error))?;
    let value: Value = serde_json::from_str(&source)
        .map_err(|error| format!("Invalid {}: {error}", path.display()))?;
    Ok(ManifestSummary {
        id: required(&value, "id")?,
        name: required(&value, "name")?,
        version: required(&value, "version")?,
        has_agent: value.get("agent").is_some_and(Value::is_object),
    })
}

fn required(value: &Value, field: &str) -> Result<String, String> {
    value
        .get(field)
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .map(str::to_owned)
        .ok_or_else(|| format!("Project manifest field '{field}' must be a non-empty string"))
}

fn reject_link(path: &Path) -> Result<(), String> {
    let metadata = std::fs::symlink_metadata(path).map_err(|error| error_at(path, error))?;
    (!metadata.file_type().is_symlink())
        .then_some(())
        .ok_or_else(|| "Project manifest cannot be a symbolic link".into())
}

fn error_at(path: &Path, error: std::io::Error) -> String {
    format!("Failed to inspect {}: {error}", path.display())
}
