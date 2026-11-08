use super::contracts::{
    DraftValidation, InitializeProjectRequest, InitializedProject, PipelineDocument,
    ProjectSummary, SavePipelineDraftRequest,
};
use super::{initializer, loader, persistence, service};
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Default)]
pub struct ProjectSession {
    root: Mutex<Option<PathBuf>>,
}

impl ProjectSession {
    fn replace_root(&self, root: PathBuf) -> Result<(), String> {
        let mut current = self.root.lock().map_err(|error| error.to_string())?;
        *current = Some(root);
        Ok(())
    }

    pub(crate) fn current_root(&self) -> Result<PathBuf, String> {
        self.root
            .lock()
            .map_err(|error| error.to_string())?
            .clone()
            .ok_or_else(|| "Open a project before loading a pipeline".into())
    }
}

#[tauri::command]
pub fn load_pipeline(
    pipeline_path: String,
    session: tauri::State<'_, ProjectSession>,
) -> Result<PipelineDocument, String> {
    loader::load(&session.current_root()?, &pipeline_path)
}

#[tauri::command]
pub fn validate_pipeline_draft(
    pipeline_path: String,
    pipeline_source: String,
    metadata_source: String,
    layout_source: Option<String>,
    session: tauri::State<'_, ProjectSession>,
) -> Result<DraftValidation, String> {
    loader::validate_draft(
        &session.current_root()?,
        &pipeline_path,
        &pipeline_source,
        &metadata_source,
        layout_source.as_deref(),
    )
}

#[tauri::command]
pub fn save_pipeline_draft(
    request: SavePipelineDraftRequest,
    session: tauri::State<'_, ProjectSession>,
) -> Result<PipelineDocument, String> {
    persistence::save(&session.current_root()?, request)
}

#[tauri::command]
pub fn open_project(
    path: String,
    session: tauri::State<'_, ProjectSession>,
) -> Result<ProjectSummary, String> {
    let (root, summary) = service::open(PathBuf::from(path).as_path())?;
    session.replace_root(root)?;
    Ok(summary)
}

#[tauri::command]
pub fn initialize_project(
    request: InitializeProjectRequest,
    session: tauri::State<'_, ProjectSession>,
) -> Result<InitializedProject, String> {
    let root = session.current_root()?;
    let pipeline_path = initializer::initialize(&root, request)?;
    let (_, summary) = service::open(&root)?;
    let document = loader::load(&root, &pipeline_path)?;
    Ok(InitializedProject { summary, document })
}
