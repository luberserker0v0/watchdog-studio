use super::contracts::PipelineSummary;
use std::path::Path;

const MAX_DEPTH: usize = 16;
const MAX_ENTRIES: usize = 5_000;

pub struct ScanResult {
    pub pipelines: Vec<PipelineSummary>,
    pub warnings: Vec<String>,
    pub is_empty: bool,
}

struct Scanner<'a> {
    root: &'a Path,
    entries: usize,
    pipelines: Vec<PipelineSummary>,
    warnings: Vec<String>,
}

pub fn scan(root: &Path) -> Result<ScanResult, String> {
    let mut scanner = Scanner {
        root,
        entries: 0,
        pipelines: Vec::new(),
        warnings: Vec::new(),
    };
    scanner.visit(root, 0)?;
    scanner
        .pipelines
        .sort_by(|left, right| left.pipeline_path.cmp(&right.pipeline_path));
    let is_empty = scanner.entries == 0;
    Ok(ScanResult {
        pipelines: scanner.pipelines,
        warnings: scanner.warnings,
        is_empty,
    })
}

impl Scanner<'_> {
    fn visit(&mut self, directory: &Path, depth: usize) -> Result<(), String> {
        if depth > MAX_DEPTH {
            return Err(format!("Project directory depth exceeds {MAX_DEPTH}"));
        }
        self.require_confined(directory)?;
        let entries = std::fs::read_dir(directory)
            .map_err(|error| format!("Failed to read {}: {error}", directory.display()))?;
        for entry in entries {
            self.handle_entry(entry.map_err(|error| error.to_string())?, depth)?;
        }
        Ok(())
    }

    fn handle_entry(&mut self, entry: std::fs::DirEntry, depth: usize) -> Result<(), String> {
        self.entries += 1;
        if self.entries > MAX_ENTRIES {
            return Err(format!("Project contains more than {MAX_ENTRIES} entries"));
        }
        let kind = entry.file_type().map_err(|error| error.to_string())?;
        if kind.is_symlink() {
            self.warnings
                .push(format!("Skipped symbolic link: {}", entry.path().display()));
        } else if kind.is_dir() {
            self.visit(&entry.path(), depth + 1)?;
        } else if kind.is_file() {
            self.inspect_file(&entry.path())?;
        }
        Ok(())
    }

    fn inspect_file(&mut self, path: &Path) -> Result<(), String> {
        let Some(name) = pipeline_name(path) else {
            return Ok(());
        };
        let metadata = path.with_file_name(format!("{name}.meta.json"));
        if !regular_file(&metadata)? {
            return Ok(());
        }
        let layout = path.with_file_name(format!("{name}.layout.json"));
        self.pipelines.push(self.summary(path, &metadata, &layout)?);
        Ok(())
    }

    fn summary(
        &self,
        pipeline: &Path,
        metadata: &Path,
        layout: &Path,
    ) -> Result<PipelineSummary, String> {
        let name = pipeline_name(pipeline)
            .ok_or_else(|| format!("Invalid pipeline filename: {}", pipeline.display()))?;
        Ok(PipelineSummary {
            name,
            pipeline_path: relative(self.root, pipeline)?,
            metadata_path: relative(self.root, metadata)?,
            layout_path: regular_file(layout)?
                .then(|| relative(self.root, layout))
                .transpose()?,
        })
    }

    fn require_confined(&self, directory: &Path) -> Result<(), String> {
        let resolved = directory
            .canonicalize()
            .map_err(|error| format!("Failed to resolve {}: {error}", directory.display()))?;
        resolved
            .starts_with(self.root)
            .then_some(())
            .ok_or_else(|| format!("Directory escapes project root: {}", directory.display()))
    }
}

fn pipeline_name(path: &Path) -> Option<String> {
    path.file_name()?
        .to_str()?
        .strip_suffix(".pipeline.json")
        .map(str::to_string)
}

fn regular_file(path: &Path) -> Result<bool, String> {
    let Ok(metadata) = std::fs::symlink_metadata(path) else {
        return Ok(false);
    };
    Ok(metadata.is_file() && !metadata.file_type().is_symlink())
}

fn relative(root: &Path, path: &Path) -> Result<String, String> {
    path.strip_prefix(root)
        .map(|value| value.to_string_lossy().replace('\\', "/"))
        .map_err(|_| format!("Path escapes project root: {}", path.display()))
}
