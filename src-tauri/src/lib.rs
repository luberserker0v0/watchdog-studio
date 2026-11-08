#![warn(clippy::too_many_lines)]

mod modules;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(modules::project::ProjectSession::default())
        .invoke_handler(tauri::generate_handler![
            modules::project::commands::open_project,
            modules::project::commands::initialize_project,
            modules::project::commands::load_pipeline,
            modules::project::commands::validate_pipeline_draft,
            modules::project::commands::save_pipeline_draft
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
