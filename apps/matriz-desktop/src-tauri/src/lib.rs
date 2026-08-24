pub mod activity;
mod catalog;
pub mod command_contract;
mod doctor;
mod native_apps;
mod ports;
mod preview;
mod processes;
pub mod resources;
pub mod runtime;
mod settings;
mod shell;
mod state;
mod tasks;
pub mod terminal;
mod workspace;

use std::fmt;

use activity::{ActivityEnvelope, ActivityHub};
use preview::{PreviewBounds, PreviewManager, PreviewState};
use serde::{Deserialize, Serialize};
use state::NativeState;
use tauri::Manager;
use tauri_plugin_autostart::ManagerExt;
use terminal::{TerminalEvent, TerminalManager, TerminalSession};
use workspace::OperationsState;

pub use catalog::{
    app_definition, gate_definition, managed_operation, quick_target, ManagedOperationKind,
};
pub use native_apps::{classify_native_app, native_executable_name, NativeAppState};
pub use runtime::{
    ensure_preview_ready, preview_navigation_allowed, runtime_url, snapshot as runtime_snapshot,
    validate_route_path, RuntimeInstance,
};
pub use settings::{DesktopSettings, SettingsStore};
pub use workspace::validate_workspace;

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ObservedProcess {
    pub pid: u32,
    pub port: u16,
    pub process_name: String,
    pub executable_path: Option<String>,
    pub state: &'static str,
}

#[cfg(test)]
impl ObservedProcess {
    fn test(pid: u32, port: u16) -> Self {
        Self {
            pid,
            port,
            process_name: "test.exe".into(),
            executable_path: None,
            state: "external",
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

pub fn ownership_is_current(
    pid: u32,
    observed: &[ObservedProcess],
    current: &[ObservedProcess],
) -> bool {
    observed
        .iter()
        .filter(|process| process.pid == pid)
        .any(|before| {
            current.iter().any(|now| {
                now.pid == before.pid
                    && now.port == before.port
                    && now.process_name == before.process_name
                    && now.executable_path == before.executable_path
            })
        })
}

pub fn listener_pid_for_app(app_id: &str, listeners: &[ObservedProcess]) -> Result<u32, String> {
    let app = app_definition(app_id)?;
    let pid = listeners
        .iter()
        .find(|listener| listener.port == app.port)
        .map(|listener| listener.pid)
        .ok_or_else(|| format!("{} is not listening on port {}", app.id, app.port))?;
    if pid <= 4 || pid == std::process::id() {
        return Err("Protected process cannot be stopped".into());
    }
    Ok(pid)
}

#[tauri::command]
fn get_snapshot(state: tauri::State<'_, NativeState>) -> Result<DesktopSnapshot, String> {
    state.refresh()
}

#[tauri::command]
fn get_runtime_snapshot(
    terminals: tauri::State<'_, TerminalManager>,
) -> Result<Vec<RuntimeInstance>, String> {
    let listeners = ports::enumerate_listeners()?;
    Ok(runtime_snapshot(&listeners, &terminals.list()?))
}

#[tauri::command(rename_all = "camelCase")]
fn open_runtime_target(
    activity: tauri::State<'_, ActivityHub>,
    app_id: String,
    route_path: String,
) -> Result<(), String> {
    let url = runtime_url(&app_id, &route_path)?;
    std::process::Command::new("explorer.exe")
        .arg(&url)
        .spawn()
        .map_err(|error| format!("Unable to open runtime target: {error}"))?;
    activity.publish(
        "runtime.target.opened",
        "info",
        "App aberto no navegador",
        Some(&route_path),
        Some(&app_id),
    );
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
async fn restart_runtime(
    terminals: tauri::State<'_, TerminalManager>,
    operations: tauri::State<'_, OperationsState>,
    activity: tauri::State<'_, ActivityHub>,
    app_id: String,
) -> Result<TerminalSession, String> {
    let operation_id = format!("app.{app_id}.web");
    let operation = managed_operation(&operation_id)?;
    if !terminals.close_operation(&operation_id)? {
        return Err(format!(
            "{app_id} is not owned by Matriz Control and cannot be restarted"
        ));
    }
    let port = app_definition(&app_id)?.port;
    let mut released = false;
    for _ in 0..40 {
        if !ports::enumerate_listeners()?
            .iter()
            .any(|listener| listener.port == port)
        {
            released = true;
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(50));
    }
    if !released {
        return Err(format!(
            "Port {port} is still occupied; runtime restart was cancelled"
        ));
    }
    let session = terminals.start_managed(&operations.root()?, &operation)?;
    activity.publish(
        "runtime.restarted",
        "success",
        "Runtime reiniciado",
        None,
        Some(&app_id),
    );
    Ok(session)
}

#[tauri::command(rename_all = "camelCase")]
fn stop_runtime(
    terminals: tauri::State<'_, TerminalManager>,
    activity: tauri::State<'_, ActivityHub>,
    app_id: String,
) -> Result<(), String> {
    app_definition(&app_id)?;
    let operation_id = format!("app.{app_id}.web");
    if !terminals.close_operation(&operation_id)? {
        return Err(format!(
            "{app_id} is not owned by Matriz Control and cannot be stopped"
        ));
    }
    activity.publish(
        "runtime.stopped",
        "info",
        "Runtime parado",
        None,
        Some(&app_id),
    );
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
async fn open_preview(
    app: tauri::AppHandle,
    preview: tauri::State<'_, PreviewManager>,
    activity: tauri::State<'_, ActivityHub>,
    app_id: String,
    route_path: String,
    bounds: PreviewBounds,
) -> Result<PreviewState, String> {
    ensure_preview_ready(&app_id, &ports::enumerate_listeners()?)?;
    let state = preview.open(&app, &app_id, &route_path, bounds)?;
    activity.publish(
        "app.preview.opened",
        "success",
        "Preview pronto",
        Some(&route_path),
        Some(&app_id),
    );
    Ok(state)
}

#[tauri::command(rename_all = "camelCase")]
async fn set_preview_bounds(
    preview: tauri::State<'_, PreviewManager>,
    bounds: PreviewBounds,
) -> Result<(), String> {
    preview.bounds(bounds)
}

#[tauri::command(rename_all = "camelCase")]
async fn navigate_preview(
    preview: tauri::State<'_, PreviewManager>,
    app_id: String,
    route_path: String,
) -> Result<PreviewState, String> {
    preview.navigate(&app_id, &route_path)
}

#[tauri::command]
async fn preview_back(preview: tauri::State<'_, PreviewManager>) -> Result<(), String> {
    preview.eval("history.back()")
}

#[tauri::command]
async fn preview_forward(preview: tauri::State<'_, PreviewManager>) -> Result<(), String> {
    preview.eval("history.forward()")
}

#[tauri::command]
async fn reload_preview(preview: tauri::State<'_, PreviewManager>) -> Result<(), String> {
    preview.reload()
}

#[tauri::command]
async fn close_preview(
    preview: tauri::State<'_, PreviewManager>,
    activity: tauri::State<'_, ActivityHub>,
) -> Result<(), String> {
    let active = preview.active_state()?;
    preview.close()?;
    if let Some(state) = active {
        activity.publish(
            "app.preview.closed",
            "info",
            "Preview fechado",
            Some(&state.route_path),
            Some(&state.app_id),
        );
    }
    Ok(())
}

#[tauri::command]
fn get_activity_history(
    activity: tauri::State<'_, ActivityHub>,
) -> Result<Vec<ActivityEnvelope>, String> {
    activity.history()
}

#[tauri::command(rename_all = "camelCase")]
fn subscribe_activity(
    activity: tauri::State<'_, ActivityHub>,
    on_event: tauri::ipc::Channel<ActivityEnvelope>,
) -> Result<(), String> {
    activity.subscribe(on_event)
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
    store: tauri::State<'_, SettingsStore>,
    path: String,
) -> Result<String, String> {
    let canonical = validate_workspace(std::path::Path::new(&path))?;
    let canonical_string = canonical.display().to_string();
    let mut settings = store.read()?;
    settings.workspace_path = Some(canonical_string.clone());
    store.write(&settings)?;
    state.select_workspace(&canonical)?;
    Ok(canonical_string)
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
fn hide_window(app: tauri::AppHandle, preview: tauri::State<'_, PreviewManager>) {
    let _ = preview.close();
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.state::<TerminalManager>().shutdown();
    app.exit(0);
}

#[tauri::command]
fn create_terminal(
    terminals: tauri::State<'_, TerminalManager>,
    operations: tauri::State<'_, OperationsState>,
) -> Result<TerminalSession, String> {
    terminals.create_shell(&operations.root()?)
}

#[tauri::command(rename_all = "camelCase")]
fn start_managed_operation(
    terminals: tauri::State<'_, TerminalManager>,
    operations: tauri::State<'_, OperationsState>,
    operation_id: String,
) -> Result<TerminalSession, String> {
    let operation = managed_operation(&operation_id)?;
    terminals.start_managed(&operations.root()?, &operation)
}

#[tauri::command]
fn get_native_app_runtime(
    operations: tauri::State<'_, OperationsState>,
) -> Result<native_apps::NativeAppRuntime, String> {
    Ok(native_apps::runtime(&operations.root()?))
}

#[tauri::command]
fn install_native_app(
    operations: tauri::State<'_, OperationsState>,
) -> Result<native_apps::NativeAppRuntime, String> {
    native_apps::install(&operations.root()?)
}

#[tauri::command]
fn start_native_app(
    operations: tauri::State<'_, OperationsState>,
) -> Result<native_apps::NativeAppRuntime, String> {
    native_apps::start(&operations.root()?)
}

#[tauri::command]
fn stop_native_app(
    operations: tauri::State<'_, OperationsState>,
) -> Result<native_apps::NativeAppRuntime, String> {
    native_apps::stop(&operations.root()?)
}

#[tauri::command(rename_all = "camelCase")]
fn write_terminal(
    terminals: tauri::State<'_, TerminalManager>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    terminals.write(&session_id, &data)
}

#[tauri::command(rename_all = "camelCase")]
fn resize_terminal(
    terminals: tauri::State<'_, TerminalManager>,
    session_id: String,
    columns: u16,
    rows: u16,
) -> Result<(), String> {
    terminals.resize(&session_id, columns, rows)
}

#[tauri::command(rename_all = "camelCase")]
fn interrupt_terminal(
    terminals: tauri::State<'_, TerminalManager>,
    session_id: String,
) -> Result<(), String> {
    terminals.interrupt(&session_id)
}

#[tauri::command(rename_all = "camelCase")]
fn close_terminal(
    terminals: tauri::State<'_, TerminalManager>,
    session_id: String,
) -> Result<(), String> {
    terminals.close(&session_id)
}

#[tauri::command]
fn list_terminals(
    terminals: tauri::State<'_, TerminalManager>,
) -> Result<Vec<TerminalSession>, String> {
    terminals.list()
}

#[tauri::command(rename_all = "camelCase")]
fn subscribe_terminal(
    terminals: tauri::State<'_, TerminalManager>,
    on_event: tauri::ipc::Channel<TerminalEvent>,
) -> Result<(), String> {
    terminals.subscribe(on_event)
}

pub fn run() {
    let activity = ActivityHub::default();
    let terminals = TerminalManager::with_activity(activity.clone());
    tauri::Builder::default()
        .plugin(shell::shortcut_plugin())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(NativeState::new())
        .manage(OperationsState::discover())
        .manage(terminals)
        .manage(PreviewManager::default())
        .manage(activity)
        .setup(|app| {
            let settings_path = app.path().app_config_dir()?.join("settings.json");
            let settings = SettingsStore::at(settings_path);
            let saved = settings.read().unwrap_or_default();
            app.state::<OperationsState>()
                .restore_workspace(saved.workspace_path.as_deref());
            app.manage(settings);
            shell::install_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::Resized(_))
                && window.is_minimized().unwrap_or(false)
            {
                let _ = window.app_handle().state::<PreviewManager>().close();
            }
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.app_handle().state::<PreviewManager>().close();
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
            get_runtime_snapshot,
            open_runtime_target,
            restart_runtime,
            stop_runtime,
            open_preview,
            set_preview_bounds,
            navigate_preview,
            preview_back,
            preview_forward,
            reload_preview,
            close_preview,
            get_activity_history,
            subscribe_activity,
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
            quit_app,
            create_terminal,
            start_managed_operation,
            write_terminal,
            resize_terminal,
            interrupt_terminal,
            close_terminal,
            list_terminals,
            subscribe_terminal,
            get_native_app_runtime,
            install_native_app,
            start_native_app,
            stop_native_app
        ])
        .run(tauri::generate_context!())
        .expect("Matriz Control native runtime failed");
}
