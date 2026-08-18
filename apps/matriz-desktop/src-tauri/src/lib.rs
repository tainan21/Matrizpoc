mod catalog;
mod doctor;
mod ports;
mod processes;
mod settings;
mod shell;
mod state;
mod tasks;
mod workspace;

use std::fmt;

use serde::{Deserialize, Serialize};
use state::NativeState;
use tauri::Manager;
use tauri_plugin_autostart::ManagerExt;
use workspace::OperationsState;

pub use catalog::{app_definition, gate_definition, quick_target};
pub use settings::{DesktopSettings, SettingsStore};
pub use workspace::validate_workspace;

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ObservedProcess {
    pub pid: u32,
    pub port: u16,
    pub process_name: String,
    pub executable_path: Option<String>,
}

#[cfg(test)]
impl ObservedProcess {
    fn test(pid: u32, port: u16) -> Self {
        Self {
            pid,
            port,
            process_name: "test.exe".into(),
            executable_path: None,
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopSnapshot {
    pub snapshot_id: String,
    pub ports: Vec<ObservedProcess>,
}

impl DesktopSnapshot {
    fn empty() -> Self {
        Self {
            snapshot_id: uuid::Uuid::new_v4().to_string(),
            ports: Vec::new(),
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminationRequest {
    pub pid: u32,
    pub snapshot_id: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminationsRequest {
    pub pids: Vec<u32>,
    pub snapshot_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum TerminationError {
    ProtectedProcess,
    StaleSnapshot,
    NotObserved,
    DuplicateProcess,
    EmptySelection,
}

impl fmt::Display for TerminationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let message = match self {
            Self::ProtectedProcess => "Protected process",
            Self::StaleSnapshot => "Stale process snapshot",
            Self::NotObserved => "Process was not observed in the current snapshot",
            Self::DuplicateProcess => "Duplicate process selection",
            Self::EmptySelection => "No process selected",
        };
        formatter.write_str(message)
    }
}

pub fn authorize_termination(
    pid: u32,
    request_snapshot_id: &str,
    current_snapshot_id: &str,
    observed: &[ObservedProcess],
    current_pid: u32,
) -> Result<(), TerminationError> {
    if request_snapshot_id != current_snapshot_id {
        return Err(TerminationError::StaleSnapshot);
    }
    if pid <= 4 || pid == current_pid {
        return Err(TerminationError::ProtectedProcess);
    }
    if !observed.iter().any(|process| process.pid == pid) {
        return Err(TerminationError::NotObserved);
    }
    Ok(())
}

pub fn authorize_batch(
    pids: &[u32],
    request_snapshot_id: &str,
    current_snapshot_id: &str,
    observed: &[ObservedProcess],
    current_pid: u32,
) -> Result<(), TerminationError> {
    if pids.is_empty() {
        return Err(TerminationError::EmptySelection);
    }
    if state::has_duplicates(pids) {
        return Err(TerminationError::DuplicateProcess);
    }
    for pid in pids {
        authorize_termination(
            *pid,
            request_snapshot_id,
            current_snapshot_id,
            observed,
            current_pid,
        )?;
    }
    Ok(())
}

#[tauri::command]
fn get_snapshot(state: tauri::State<'_, NativeState>) -> Result<DesktopSnapshot, String> {
    state.refresh()
}

#[tauri::command]
fn terminate_process(
    state: tauri::State<'_, NativeState>,
    request: TerminationRequest,
) -> Result<DesktopSnapshot, String> {
    state.terminate(&request)
}

#[tauri::command]
fn terminate_processes(
    state: tauri::State<'_, NativeState>,
    request: TerminationsRequest,
) -> Result<DesktopSnapshot, String> {
    state.terminate_many(&request)
}

#[tauri::command(rename_all = "camelCase")]
fn select_workspace(
    state: tauri::State<'_, OperationsState>,
    path: String,
) -> Result<String, String> {
    state
        .select_workspace(std::path::Path::new(&path))
        .map(|path| path.display().to_string())
}

#[tauri::command(rename_all = "camelCase")]
fn start_app(state: tauri::State<'_, OperationsState>, app_id: String) -> Result<(), String> {
    state.start_app(&app_id)
}

#[tauri::command(rename_all = "camelCase")]
fn stop_app(state: tauri::State<'_, OperationsState>, app_id: String) -> Result<(), String> {
    state.stop_app(&app_id)
}

#[tauri::command(rename_all = "camelCase")]
fn get_app_statuses(
    state: tauri::State<'_, OperationsState>,
) -> Result<Vec<workspace::AppRuntime>, String> {
    state.app_statuses()
}

#[tauri::command(rename_all = "camelCase")]
fn run_gate(
    state: tauri::State<'_, OperationsState>,
    gate_id: String,
) -> Result<tasks::GateResult, String> {
    tasks::run_gate(&state, &gate_id)
}

#[tauri::command(rename_all = "camelCase")]
fn open_target(state: tauri::State<'_, OperationsState>, target_id: String) -> Result<(), String> {
    state.open_target(&target_id)
}

#[tauri::command]
fn run_doctor(state: tauri::State<'_, OperationsState>) -> Vec<doctor::DoctorCheck> {
    doctor::run_doctor(&state)
}

#[tauri::command]
fn get_workspace_pulse(
    state: tauri::State<'_, OperationsState>,
) -> Result<doctor::WorkspacePulse, String> {
    doctor::workspace_pulse(&state)
}

#[tauri::command]
fn read_settings(store: tauri::State<'_, SettingsStore>) -> Result<DesktopSettings, String> {
    store.read()
}

#[tauri::command]
fn write_settings(
    app: tauri::AppHandle,
    store: tauri::State<'_, SettingsStore>,
    settings: DesktopSettings,
) -> Result<DesktopSettings, String> {
    let settings = settings.normalized();
    store.write(&settings)?;
    if settings.start_with_windows {
        app.autolaunch()
            .enable()
            .map_err(|error| error.to_string())?;
    } else {
        app.autolaunch()
            .disable()
            .map_err(|error| error.to_string())?;
    }
    Ok(settings)
}

#[tauri::command]
fn hide_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

pub fn run() {
    tauri::Builder::default()
        .plugin(shell::shortcut_plugin())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(NativeState::new())
        .manage(OperationsState::discover())
        .setup(|app| {
            let settings_path = app.path().app_config_dir()?.join("settings.json");
            app.manage(SettingsStore::at(settings_path));
            shell::install_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let close_to_tray = window
                    .app_handle()
                    .state::<SettingsStore>()
                    .read()
                    .map(|settings| settings.close_to_tray)
                    .unwrap_or(true);
                if close_to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_snapshot,
            terminate_process,
            terminate_processes,
            select_workspace,
            start_app,
            stop_app,
            get_app_statuses,
            run_gate,
            open_target,
            run_doctor,
            get_workspace_pulse,
            read_settings,
            write_settings,
            hide_window,
            quit_app
        ])
        .run(tauri::generate_context!())
        .expect("Matriz Control native runtime failed");
}
