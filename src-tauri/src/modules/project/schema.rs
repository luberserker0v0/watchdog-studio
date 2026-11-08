use super::contracts::{SourceDiagnostic, SpecificationVersion};
use serde_json::Value;
use std::sync::OnceLock;

const METADATA_SCHEMA: &str = include_str!("../../../../schemas/watchdog-metadata.schema.json");
const PIPELINE_SCHEMA: &str = include_str!("../../../../schemas/watchdog-pipeline.schema.json");
const LAYOUT_SCHEMA: &str = include_str!("../../../../schemas/watchdog-layout.schema.json");
const SPECIFICATION: &str = include_str!("../../../../schemas/watchdog-spec.json");

pub fn specification() -> Result<SpecificationVersion, String> {
    static VERSION: OnceLock<Result<SpecificationVersion, String>> = OnceLock::new();
    VERSION
        .get_or_init(|| serde_json::from_str(SPECIFICATION).map_err(|error| error.to_string()))
        .clone()
}

pub fn validate_metadata(source: &str, file: &str) -> Vec<SourceDiagnostic> {
    validate(source, file, metadata_validator())
}

pub fn validate_layout(source: &str, file: &str) -> Vec<SourceDiagnostic> {
    validate(source, file, layout_validator())
}

pub fn validate_pipeline(source: &str, file: &str) -> Vec<SourceDiagnostic> {
    validate(source, file, pipeline_validator())
}

fn validate(
    source: &str,
    file: &str,
    validator: Result<&jsonschema::Validator, String>,
) -> Vec<SourceDiagnostic> {
    let value = match serde_json::from_str::<Value>(source) {
        Ok(value) => value,
        Err(error) => return vec![json_diagnostic(file, error)],
    };
    let validator = match validator {
        Ok(validator) => validator,
        Err(error) => return vec![diagnostic(file, "$", error)],
    };
    validator
        .iter_errors(&value)
        .map(|error| diagnostic(file, &error.instance_path().to_string(), error.to_string()))
        .collect()
}

fn metadata_validator() -> Result<&'static jsonschema::Validator, String> {
    static VALIDATOR: OnceLock<Result<jsonschema::Validator, String>> = OnceLock::new();
    cached_validator(&VALIDATOR, METADATA_SCHEMA)
}

fn layout_validator() -> Result<&'static jsonschema::Validator, String> {
    static VALIDATOR: OnceLock<Result<jsonschema::Validator, String>> = OnceLock::new();
    cached_validator(&VALIDATOR, LAYOUT_SCHEMA)
}

fn pipeline_validator() -> Result<&'static jsonschema::Validator, String> {
    static VALIDATOR: OnceLock<Result<jsonschema::Validator, String>> = OnceLock::new();
    cached_validator(&VALIDATOR, PIPELINE_SCHEMA)
}

fn cached_validator(
    cache: &'static OnceLock<Result<jsonschema::Validator, String>>,
    source: &str,
) -> Result<&'static jsonschema::Validator, String> {
    cache
        .get_or_init(|| compile(source))
        .as_ref()
        .map_err(Clone::clone)
}

fn compile(source: &str) -> Result<jsonschema::Validator, String> {
    let schema = serde_json::from_str(source).map_err(|error| error.to_string())?;
    jsonschema::draft202012::new(&schema).map_err(|error| error.to_string())
}

fn json_diagnostic(file: &str, error: serde_json::Error) -> SourceDiagnostic {
    diagnostic(
        file,
        &format!("line {}, column {}", error.line(), error.column()),
        format!("Invalid JSON: {error}"),
    )
}

fn diagnostic(file: &str, path: &str, message: String) -> SourceDiagnostic {
    SourceDiagnostic {
        file: file.to_string(),
        path: if path.is_empty() { "/" } else { path }.to_string(),
        message,
    }
}
