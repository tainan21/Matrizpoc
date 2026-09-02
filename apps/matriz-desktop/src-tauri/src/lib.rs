pub mod activity;
pub mod awake;
mod catalog;
pub mod command_contract;
pub mod commerce;
mod doctor;
pub mod environment;
pub mod explorer;
pub mod git;
pub mod hub_state;
pub mod infrastructure;
mod native_apps;
pub mod node_sweep;
mod ports;
mod preview;
mod processes;
pub mod recovery;
pub mod resources;
pub mod runbooks;
pub mod runtime;
mod settings;
mod shell;
mod state;
pub mod system_pulse;
mod tasks;
pub mod terminal;
pub mod updater;
mod workspace;

use std::{
    fmt,
    path::{Path, PathBuf},
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use activity::{ActivityEnvelope, ActivityHub};
use awake::AwakeManager;
use commerce::{CommerceSnapshot, CommerceStore, PackageActivationTarget};
use doctor::{DoctorRemedyPreview, DoctorRemedyResult, DoctorRemedyService};
use environment::{
    EnvironmentComparison, EnvironmentDocument, EnvironmentExport, EnvironmentExportStore,
    EnvironmentFile, EnvironmentPromotionRequest, EnvironmentSaveRequest, EnvironmentService,
};
use explorer::{DirectoryListing, EnvironmentReferenceResult, ExplorerService, FilePreview};
use git::{
    GitBranchRequest, GitCommitRequest, GitDiff, GitDiffRequest, GitMergePreview, GitRemoteAction,
    GitSelectionRequest, GitService, GitSnapshot,
};
use hub_state::{HubStateSnapshot, HubStateStore, SessionContext};
use infrastructure::{
    BackupRecord, DatabaseMigrationPreview, DatabaseMigrationSnapshot, DatabaseSeedPreview,
    EventQueueDiagnostic, InfrastructureActionPreview, InfrastructureManager,
    InfrastructurePreviewRequest, InfrastructureServiceId, InfrastructureSnapshot,
    PortableInfrastructureHost,
};
use node_sweep::{NodeSweepDeletion, NodeSweepScan, NodeSweepService};
use preview::{PreviewBounds, PreviewManager, PreviewState};
use recovery::{recovery_action, RecoveryAction, RecoveryResult};
use runbooks::{RunbookDefinition, RunbookExecution, RunbookStepResult, RunbookTarget};
use serde::{Deserialize, Serialize};
use state::NativeState;
use system_pulse::{SystemPulse, SystemPulseService};
use tauri::Manager;
use tauri_plugin_autostart::ManagerExt;
use terminal::{TerminalEvent, TerminalManager, TerminalReadiness, TerminalSession};
use updater::{UpdateInfo, UpdateManager, UpdateProgress};
use workspace::OperationsState;

pub use catalog::{
    app_definition, gate_definition, managed_operation, quick_target, ManagedOperationKind,
};
pub use native_apps::{classify_native_app, native_executable_name, NativeAppState};
pub use runtime::{
    ensure_preview_ready, preview_navigation_allowed, runtime_url, snapshot as runtime_snapshot,
    validate_route_path, RuntimeInstance,
};
pub use settings::{DesktopSettings, DesktopTheme, SettingsStore};
pub use workspace::validate_workspace;

pub fn resolve_acceptance_config_dir(
    default: &Path,
    temporary_root: &Path,
    acceptance_enabled: Option<&str>,
    requested: Option<&str>,
) -> PathBuf {
    if acceptance_enabled != Some("1") {
        return default.to_path_buf();
    }
    let Some(requested) = requested else {
        return default.to_path_buf();
    };
    let Ok(temporary_root) = temporary_root.canonicalize() else {
        return default.to_path_buf();
    };
    let Ok(requested) = PathBuf::from(requested).canonicalize() else {
        return default.to_path_buf();
    };
    if requested.starts_with(temporary_root) {
        requested
    } else {
        default.to_path_buf()
    }
}

fn acceptance_mode() -> bool {
    std::env::var("MATRIZ_CONTROL_ACCEPTANCE").as_deref() == Ok("1")
}

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
    operations: tauri::State<'_, OperationsState>,
    hub_state: tauri::State<'_, HubStateStore>,
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
    hub_state.mark_used(operations.root()?, &app_id)?;
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
async fn restart_runtime(
    terminals: tauri::State<'_, TerminalManager>,
    operations: tauri::State<'_, OperationsState>,
    activity: tauri::State<'_, ActivityHub>,
    hub_state: tauri::State<'_, HubStateStore>,
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
    hub_state.mark_used(operations.root()?, &app_id)?;
    Ok(session)
}

#[tauri::command(rename_all = "camelCase")]
async fn recover_runtime(
    terminals: tauri::State<'_, TerminalManager>,
    operations: tauri::State<'_, OperationsState>,
    activity: tauri::State<'_, ActivityHub>,
    app_id: String,
) -> Result<RecoveryResult, String> {
    let result = recover_runtime_inner(&terminals, &operations, &activity, app_id.clone());
    if result.is_err() {
        activity.publish(
            "runtime.recovery.failed",
            "error",
            "Recuperação não concluída",
            None,
            Some(&app_id),
        );
    }
    result
}

fn recover_runtime_inner(
    terminals: &TerminalManager,
    operations: &OperationsState,
    activity: &ActivityHub,
    app_id: String,
) -> Result<RecoveryResult, String> {
    let listeners = ports::enumerate_listeners()?;
    let current = runtime_snapshot(&listeners, &terminals.list()?)
        .into_iter()
        .find(|runtime| runtime.id == app_id)
        .ok_or_else(|| "Runtime is not registered".to_string())?;
    let action = recovery_action(current.status, current.ownership);
    if action == RecoveryAction::DiagnoseOnly {
        activity.publish(
            "runtime.recovery.diagnosed",
            "warning",
            "Runtime externo preservado",
            Some("A porta pertence a outro processo; nenhuma ação foi executada"),
            Some(&app_id),
        );
        return Ok(RecoveryResult {
            app_id,
            status: "diagnoseOnly",
            session_id: None,
        });
    }

    let operation_id = format!("app.{app_id}.web");
    let operation = managed_operation(&operation_id)?;
    if action == RecoveryAction::Restart {
        let _ = terminals.close_operation(&operation_id)?;
        for _ in 0..40 {
            if !ports::enumerate_listeners()?
                .iter()
                .any(|listener| listener.port == current.port)
            {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(50));
        }
        if ports::enumerate_listeners()?
            .iter()
            .any(|listener| listener.port == current.port)
        {
            return Err(format!(
                "Port {} is still occupied; recovery was cancelled",
                current.port
            ));
        }
    }
    let session = terminals.start_managed(&operations.root()?, &operation)?;
    let mut ready = false;
    for _ in 0..100 {
        if ports::enumerate_listeners()?.iter().any(|listener| {
            listener.port == current.port
                && session
                    .process_id
                    .is_some_and(|root| runtime::process_belongs_to(root, listener.pid))
        }) {
            ready = true;
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(100));
    }
    if !ready {
        return Err(format!(
            "{} did not become ready after recovery",
            current.label
        ));
    }
    activity.publish(
        "runtime.recovered",
        "success",
        "Runtime recuperado",
        Some(&format!("Porta {} pronta", current.port)),
        Some(&app_id),
    );
    Ok(RecoveryResult {
        app_id,
        status: "ready",
        session_id: Some(session.id),
    })
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

#[tauri::command]
fn get_runbook_catalog() -> Vec<RunbookDefinition> {
    runbooks::catalog()
}

#[tauri::command(rename_all = "camelCase")]
fn run_runbook(
    terminals: tauri::State<'_, TerminalManager>,
    operations: tauri::State<'_, OperationsState>,
    activity: tauri::State<'_, ActivityHub>,
    runbook_id: String,
    app_id: String,
) -> Result<RunbookExecution, String> {
    app_definition(&app_id)?;
    let _runbook_guard = runbooks::begin(&app_id)?;
    let definition = runbooks::definition(&runbook_id)?;
    let mut execution = RunbookExecution {
        runbook_id: definition.id,
        app_id: app_id.clone(),
        status: "completed",
        steps: Vec::new(),
        target: None,
    };
    activity.publish(
        "runbook.started",
        "info",
        "Runbook iniciado",
        Some(definition.label),
        Some(&app_id),
    );

    for &step in definition.steps {
        let result: Result<String, String> = (|| match step {
            "environment.validate" => {
                let service = EnvironmentService::new(resources::WorkspaceResourceService::new(
                    operations.root()?,
                )?);
                let files = service.list(&app_id)?;
                let selected = files
                    .iter()
                    .find(|item| item.file_name == ".env.local")
                    .or_else(|| files.first());
                match selected
                    .map(|item| service.read(&app_id, &item.file_name))
                    .transpose()?
                {
                    Some(document) if document.missing_required.is_empty() => {
                        Ok("Ambiente válido".to_string())
                    }
                    Some(document) => Err(format!(
                        "{} variável(is) obrigatória(s) ausente(s)",
                        document.missing_required.len()
                    )),
                    None => Err("Nenhum arquivo de ambiente encontrado".into()),
                }
            }
            "doctor.run" => {
                let checks = doctor::run_doctor(&operations);
                if checks.iter().all(|check| check.ok) {
                    Ok("Doctor aprovado".into())
                } else {
                    Err("Doctor encontrou dependências indisponíveis".into())
                }
            }
            "runtime.recover" => {
                let result =
                    recover_runtime_inner(&terminals, &operations, &activity, app_id.clone())?;
                if result.status == "ready" {
                    Ok("Runtime pronto".into())
                } else {
                    Err("Runtime externo preservado; recuperação automática indisponível".into())
                }
            }
            "runtime.open" => {
                let url = runtime_url(&app_id, "/")?;
                std::process::Command::new("explorer.exe")
                    .arg(url)
                    .spawn()
                    .map(|_| "Rota principal aberta".into())
                    .map_err(|error| format!("Não foi possível abrir o runtime: {error}"))
            }
            "preview.offer" => {
                execution.target = Some(RunbookTarget {
                    app_id: app_id.clone(),
                    route_path: "/",
                });
                Ok("Aplicação pronta para visualização".into())
            }
            _ => Err("Runbook step is unsupported".into()),
        })();
        match result {
            Ok(detail) => execution.steps.push(RunbookStepResult {
                step_id: step,
                status: if step == "preview.offer" {
                    "available"
                } else {
                    "completed"
                },
                detail,
            }),
            Err(detail) => {
                execution.status = "failed";
                execution.steps.push(RunbookStepResult {
                    step_id: step,
                    status: "failed",
                    detail,
                });
                break;
            }
        }
    }
    activity.publish(
        "runbook.completed",
        if execution.status == "completed" {
            "success"
        } else {
            "error"
        },
        if execution.status == "completed" {
            "Runbook concluído"
        } else {
            "Runbook interrompido"
        },
        Some(definition.label),
        Some(&app_id),
    );
    Ok(execution)
}

#[tauri::command(rename_all = "camelCase")]
fn open_target(state: tauri::State<'_, OperationsState>, target_id: String) -> Result<(), String> {
    state.open_target(&target_id)
}

#[tauri::command]
async fn run_doctor(
    state: tauri::State<'_, OperationsState>,
) -> Result<Vec<doctor::DoctorCheck>, String> {
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || doctor::run_doctor(&state))
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn preview_doctor_remedy(
    remedies: tauri::State<'_, DoctorRemedyService>,
    remedy_id: String,
) -> Result<DoctorRemedyPreview, String> {
    remedies.preview(&remedy_id)
}

#[tauri::command]
fn confirm_doctor_remedy(
    remedies: tauri::State<'_, DoctorRemedyService>,
    confirmation_token: String,
) -> Result<DoctorRemedyResult, String> {
    remedies.confirm(&confirmation_token)
}

#[tauri::command]
async fn get_git_snapshot(
    operations: tauri::State<'_, OperationsState>,
    git: tauri::State<'_, GitService>,
) -> Result<GitSnapshot, String> {
    let root = operations.root()?;
    let git = git.inner().clone();
    tauri::async_runtime::spawn_blocking(move || git.snapshot(&root))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn get_git_diff(
    operations: tauri::State<'_, OperationsState>,
    git: tauri::State<'_, GitService>,
    request: GitDiffRequest,
) -> Result<GitDiff, String> {
    let root = operations.root()?;
    let git = git.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        git.diff(&root, &request.revision, &request.change_id)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn stage_git_changes(
    operations: tauri::State<'_, OperationsState>,
    git: tauri::State<'_, GitService>,
    request: GitSelectionRequest,
) -> Result<GitSnapshot, String> {
    let root = operations.root()?;
    let git = git.inner().clone();
    tauri::async_runtime::spawn_blocking(move || git.stage(&root, &request))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn unstage_git_changes(
    operations: tauri::State<'_, OperationsState>,
    git: tauri::State<'_, GitService>,
    request: GitSelectionRequest,
) -> Result<GitSnapshot, String> {
    let root = operations.root()?;
    let git = git.inner().clone();
    tauri::async_runtime::spawn_blocking(move || git.unstage(&root, &request))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn commit_git_changes(
    operations: tauri::State<'_, OperationsState>,
    git: tauri::State<'_, GitService>,
    request: GitCommitRequest,
) -> Result<GitSnapshot, String> {
    let root = operations.root()?;
    let git = git.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        git.commit(&root, &request.revision, &request.message)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GitRemoteRequest {
    revision: String,
    action: GitRemoteAction,
}

#[tauri::command]
async fn run_git_remote(
    operations: tauri::State<'_, OperationsState>,
    git: tauri::State<'_, GitService>,
    request: GitRemoteRequest,
) -> Result<GitSnapshot, String> {
    let root = operations.root()?;
    let git = git.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        git.remote(&root, &request.revision, request.action)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn run_git_branch(
    operations: tauri::State<'_, OperationsState>,
    git: tauri::State<'_, GitService>,
    request: GitBranchRequest,
) -> Result<GitSnapshot, String> {
    let root = operations.root()?;
    let git = git.inner().clone();
    tauri::async_runtime::spawn_blocking(move || git.branch(&root, &request))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn preview_git_merge(
    operations: tauri::State<'_, OperationsState>,
    git: tauri::State<'_, GitService>,
    revision: String,
    target: String,
) -> Result<GitMergePreview, String> {
    let root = operations.root()?;
    let git = git.inner().clone();
    tauri::async_runtime::spawn_blocking(move || git.preview_merge(&root, &revision, &target))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn confirm_git_merge(
    operations: tauri::State<'_, OperationsState>,
    git: tauri::State<'_, GitService>,
    confirmation_token: String,
) -> Result<GitSnapshot, String> {
    let root = operations.root()?;
    let git = git.inner().clone();
    tauri::async_runtime::spawn_blocking(move || git.confirm_merge(&root, &confirmation_token))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn abort_git_merge(
    operations: tauri::State<'_, OperationsState>,
    git: tauri::State<'_, GitService>,
    revision: String,
) -> Result<GitSnapshot, String> {
    let root = operations.root()?;
    let git = git.inner().clone();
    tauri::async_runtime::spawn_blocking(move || git.abort_merge(&root, &revision))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
fn get_workspace_pulse(
    state: tauri::State<'_, OperationsState>,
) -> Result<doctor::WorkspacePulse, String> {
    doctor::workspace_pulse(&state)
}

#[tauri::command]
async fn get_system_pulse(
    state: tauri::State<'_, OperationsState>,
    pulse: tauri::State<'_, SystemPulseService>,
) -> Result<SystemPulse, String> {
    let workspace = state.root().ok();
    let pulse = pulse.inner().clone();
    tauri::async_runtime::spawn_blocking(move || pulse.snapshot(workspace.as_deref()))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
fn get_awake_state(awake: tauri::State<'_, AwakeManager>) -> bool {
    awake.enabled()
}

#[tauri::command(rename_all = "camelCase")]
fn set_awake(awake: tauri::State<'_, AwakeManager>, enabled: bool) -> Result<bool, String> {
    awake.set_enabled(enabled)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct NodeSweepDeleteRequest {
    scan_id: String,
    app_ids: Vec<String>,
}

#[tauri::command]
async fn scan_node_modules(
    operations: tauri::State<'_, OperationsState>,
    store: tauri::State<'_, HubStateStore>,
    sweep: tauri::State<'_, NodeSweepService>,
) -> Result<NodeSweepScan, String> {
    let workspace = operations.root()?;
    let store = store.inner().clone();
    let sweep = sweep.inner().clone();
    tauri::async_runtime::spawn_blocking(move || sweep.scan(&workspace, &store))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn delete_node_modules(
    operations: tauri::State<'_, OperationsState>,
    store: tauri::State<'_, HubStateStore>,
    sweep: tauri::State<'_, NodeSweepService>,
    request: NodeSweepDeleteRequest,
) -> Result<NodeSweepDeletion, String> {
    let workspace = operations.root()?;
    let store = store.inner().clone();
    let sweep = sweep.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        sweep.delete(&workspace, &store, &request.scan_id, &request.app_ids)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
fn read_resume_session(
    operations: tauri::State<'_, OperationsState>,
    store: tauri::State<'_, HubStateStore>,
) -> Result<HubStateSnapshot, String> {
    store.read(operations.root()?)
}

#[tauri::command]
fn record_session_context(
    operations: tauri::State<'_, OperationsState>,
    store: tauri::State<'_, HubStateStore>,
    context: SessionContext,
) -> Result<HubStateSnapshot, String> {
    if let Some(app_id) = context.app_id.as_deref() {
        app_definition(app_id)?;
    }
    let workspace = operations.root()?;
    store.record(&workspace, context)?;
    store.read(workspace)
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
    if !acceptance_mode() {
        let autostart = app.autolaunch();
        let enabled = autostart.is_enabled().map_err(|error| error.to_string())?;
        if settings.start_with_windows && !enabled {
            autostart.enable().map_err(|error| error.to_string())?;
        } else if !settings.start_with_windows && enabled {
            autostart.disable().map_err(|error| error.to_string())?;
        }
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
    app.state::<AwakeManager>().shutdown();
    app.state::<TerminalManager>().shutdown();
    app.exit(0);
}

#[tauri::command]
async fn check_update(
    app: tauri::AppHandle,
    manager: tauri::State<'_, UpdateManager>,
) -> Result<UpdateInfo, String> {
    manager.check(&app).await
}

#[tauri::command]
async fn download_update(
    manager: tauri::State<'_, UpdateManager>,
    on_event: tauri::ipc::Channel<UpdateProgress>,
) -> Result<UpdateInfo, String> {
    manager.download(on_event).await
}

#[tauri::command]
fn install_update(manager: tauri::State<'_, UpdateManager>) -> Result<(), String> {
    manager.install()
}

#[tauri::command]
fn terminal_readiness(
    terminals: tauri::State<'_, TerminalManager>,
    operations: tauri::State<'_, OperationsState>,
) -> Result<TerminalReadiness, String> {
    terminals.readiness(operations.root())
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
    hub_state: tauri::State<'_, HubStateStore>,
    operation_id: String,
) -> Result<TerminalSession, String> {
    let operation = managed_operation(&operation_id)?;
    let workspace = operations.root()?;
    let session = terminals.start_managed(&workspace, &operation)?;
    if let Some(app_id) = operation_id
        .strip_prefix("app.")
        .and_then(|value| value.strip_suffix(".web"))
    {
        hub_state.mark_used(&workspace, app_id)?;
    }
    Ok(session)
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
fn list_environments(
    operations: tauri::State<'_, OperationsState>,
    app_id: String,
) -> Result<Vec<EnvironmentFile>, String> {
    EnvironmentService::new(resources::WorkspaceResourceService::new(
        operations.root()?,
    )?)
    .list(&app_id)
}

#[tauri::command(rename_all = "camelCase")]
fn read_environment(
    operations: tauri::State<'_, OperationsState>,
    app_id: String,
    file_name: String,
) -> Result<EnvironmentDocument, String> {
    EnvironmentService::new(resources::WorkspaceResourceService::new(
        operations.root()?,
    )?)
    .read(&app_id, &file_name)
}

#[tauri::command(rename_all = "camelCase")]
fn reveal_environment_value(
    operations: tauri::State<'_, OperationsState>,
    app_id: String,
    file_name: String,
    key: String,
) -> Result<String, String> {
    EnvironmentService::new(resources::WorkspaceResourceService::new(
        operations.root()?,
    )?)
    .reveal(&app_id, &file_name, &key)
}

#[tauri::command]
fn save_environment(
    operations: tauri::State<'_, OperationsState>,
    activity: tauri::State<'_, ActivityHub>,
    request: EnvironmentSaveRequest,
) -> Result<EnvironmentDocument, String> {
    let app_id = request.app_id.clone();
    let file_name = request.file_name.clone();
    let document = EnvironmentService::new(resources::WorkspaceResourceService::new(
        operations.root()?,
    )?)
    .save(request)?;
    activity.publish(
        "environment.saved",
        "success",
        "Ambiente salvo",
        Some(&file_name),
        Some(&app_id),
    );
    Ok(document)
}

#[tauri::command(rename_all = "camelCase")]
fn compare_environments(
    operations: tauri::State<'_, OperationsState>,
    app_id: String,
    source_file: String,
    target_file: String,
) -> Result<EnvironmentComparison, String> {
    EnvironmentService::new(resources::WorkspaceResourceService::new(
        operations.root()?,
    )?)
    .compare(&app_id, &source_file, &target_file)
}

#[tauri::command]
fn promote_environment(
    operations: tauri::State<'_, OperationsState>,
    activity: tauri::State<'_, ActivityHub>,
    request: EnvironmentPromotionRequest,
) -> Result<EnvironmentDocument, String> {
    let app_id = request.app_id.clone();
    let target_file = request.target_file.clone();
    let count = request.keys.len();
    let document = EnvironmentService::new(resources::WorkspaceResourceService::new(
        operations.root()?,
    )?)
    .promote(request)?;
    activity.publish(
        "environment.promoted",
        "success",
        "Variáveis promovidas",
        Some(&format!("{target_file} · {count} chaves")),
        Some(&app_id),
    );
    Ok(document)
}

#[tauri::command(rename_all = "camelCase")]
fn generate_environment_export(
    operations: tauri::State<'_, OperationsState>,
    exports: tauri::State<'_, EnvironmentExportStore>,
    app_id: String,
) -> Result<EnvironmentExport, String> {
    let resources = resources::WorkspaceResourceService::new(operations.root()?)?;
    exports.generate(&resources, &app_id)
}

#[tauri::command(rename_all = "camelCase")]
fn reveal_environment_export(
    exports: tauri::State<'_, EnvironmentExportStore>,
    export_id: String,
) -> Result<(), String> {
    exports.reveal(&export_id)
}

#[tauri::command]
fn list_directory(
    state: tauri::State<'_, OperationsState>,
    app_id: String,
    relative_path: String,
) -> Result<DirectoryListing, String> {
    ExplorerService::new(state.root()?)?.list(&app_id, &relative_path)
}

#[tauri::command]
fn preview_file(
    state: tauri::State<'_, OperationsState>,
    app_id: String,
    relative_path: String,
) -> Result<FilePreview, String> {
    ExplorerService::new(state.root()?)?.preview(&app_id, &relative_path)
}

#[tauri::command(rename_all = "camelCase")]
async fn find_environment_references(
    state: tauri::State<'_, OperationsState>,
    app_id: String,
    key: String,
) -> Result<EnvironmentReferenceResult, String> {
    let root = state.root()?;
    tauri::async_runtime::spawn_blocking(move || {
        ExplorerService::new(root)?.find_environment_references(&app_id, &key)
    })
    .await
    .map_err(|error| format!("Impact scan task failed: {error}"))?
}

#[tauri::command]
fn open_resource(
    state: tauri::State<'_, OperationsState>,
    app_id: String,
    relative_path: String,
) -> Result<(), String> {
    ExplorerService::new(state.root()?)?.open(&app_id, &relative_path)
}

#[tauri::command]
fn reveal_resource(
    state: tauri::State<'_, OperationsState>,
    app_id: String,
    relative_path: String,
) -> Result<(), String> {
    ExplorerService::new(state.root()?)?.reveal(&app_id, &relative_path)
}

#[tauri::command]
fn open_resource_in_editor(
    state: tauri::State<'_, OperationsState>,
    app_id: String,
    relative_path: String,
) -> Result<(), String> {
    ExplorerService::new(state.root()?)?.open_in_editor(&app_id, &relative_path)
}

#[tauri::command]
fn rename_resource(
    state: tauri::State<'_, OperationsState>,
    activity: tauri::State<'_, ActivityHub>,
    app_id: String,
    relative_path: String,
    new_name: String,
) -> Result<(), String> {
    ExplorerService::new(state.root()?)?.rename(&app_id, &relative_path, &new_name)?;
    activity.publish(
        "repository.resource.renamed",
        "info",
        "Arquivo renomeado",
        Some(&relative_path),
        Some(&app_id),
    );
    Ok(())
}

#[tauri::command]
fn duplicate_resource(
    state: tauri::State<'_, OperationsState>,
    activity: tauri::State<'_, ActivityHub>,
    app_id: String,
    relative_path: String,
    new_name: String,
) -> Result<(), String> {
    ExplorerService::new(state.root()?)?.duplicate(&app_id, &relative_path, &new_name)?;
    activity.publish(
        "repository.resource.duplicated",
        "info",
        "Arquivo duplicado",
        Some(&relative_path),
        Some(&app_id),
    );
    Ok(())
}

#[tauri::command]
fn recycle_resource(
    state: tauri::State<'_, OperationsState>,
    activity: tauri::State<'_, ActivityHub>,
    app_id: String,
    relative_path: String,
) -> Result<(), String> {
    ExplorerService::new(state.root()?)?.recycle(&app_id, &relative_path)?;
    activity.publish(
        "repository.resource.recycled",
        "warning",
        "Arquivo movido para a Lixeira",
        Some(&relative_path),
        Some(&app_id),
    );
    Ok(())
}

#[tauri::command]
fn get_commerce_snapshot(
    commerce: tauri::State<'_, CommerceStore>,
) -> Result<CommerceSnapshot, String> {
    commerce.snapshot()
}

#[tauri::command(rename_all = "camelCase")]
fn acquire_package(
    commerce: tauri::State<'_, CommerceStore>,
    activity: tauri::State<'_, ActivityHub>,
    package_id: String,
) -> Result<CommerceSnapshot, String> {
    let snapshot = commerce.acquire(&package_id)?;
    activity.publish(
        "store.package.acquired",
        "success",
        "Pacote adquirido",
        Some(&package_id),
        None,
    );
    Ok(snapshot)
}

#[tauri::command(rename_all = "camelCase")]
fn install_package(
    commerce: tauri::State<'_, CommerceStore>,
    activity: tauri::State<'_, ActivityHub>,
    package_id: String,
    granted_permissions: Vec<String>,
) -> Result<CommerceSnapshot, String> {
    let permissions = granted_permissions
        .iter()
        .map(String::as_str)
        .collect::<Vec<_>>();
    let snapshot = commerce.install(&package_id, &permissions)?;
    activity.publish(
        "store.package.installed",
        "success",
        "Pacote instalado",
        Some(&package_id),
        None,
    );
    Ok(snapshot)
}

#[tauri::command(rename_all = "camelCase")]
fn repair_package(
    commerce: tauri::State<'_, CommerceStore>,
    activity: tauri::State<'_, ActivityHub>,
    package_id: String,
) -> Result<CommerceSnapshot, String> {
    let snapshot = commerce.repair(&package_id)?;
    activity.publish(
        "store.package.repaired",
        "success",
        "Confiança do pacote restaurada",
        Some(&package_id),
        None,
    );
    Ok(snapshot)
}

#[tauri::command(rename_all = "camelCase")]
fn uninstall_package(
    commerce: tauri::State<'_, CommerceStore>,
    activity: tauri::State<'_, ActivityHub>,
    package_id: String,
) -> Result<CommerceSnapshot, String> {
    let snapshot = commerce.uninstall(&package_id)?;
    activity.publish(
        "store.package.uninstalled",
        "info",
        "Pacote removido",
        Some(&package_id),
        None,
    );
    Ok(snapshot)
}

#[tauri::command(rename_all = "camelCase")]
fn activate_package(
    commerce: tauri::State<'_, CommerceStore>,
    activity: tauri::State<'_, ActivityHub>,
    package_id: String,
) -> Result<PackageActivationTarget, String> {
    let target = commerce.activate(&package_id)?;
    let app_id = match &target {
        PackageActivationTarget::Runtime { app_id, .. } => Some(app_id.as_str()),
        PackageActivationTarget::Control { .. } => None,
    };
    activity.publish(
        "store.package.target.validated",
        "info",
        "Alvo do pacote validado",
        Some(&package_id),
        app_id,
    );
    Ok(target)
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

#[tauri::command]
async fn infrastructure_snapshot(
    manager: tauri::State<'_, Arc<InfrastructureManager>>,
) -> Result<InfrastructureSnapshot, String> {
    let manager = Arc::clone(manager.inner());
    tauri::async_runtime::spawn_blocking(move || manager.snapshot())
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn preview_infrastructure_action(
    manager: tauri::State<'_, Arc<InfrastructureManager>>,
    request: InfrastructurePreviewRequest,
) -> Result<InfrastructureActionPreview, String> {
    let manager = Arc::clone(manager.inner());
    tauri::async_runtime::spawn_blocking(move || manager.preview(request))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command(rename_all = "camelCase")]
async fn confirm_infrastructure_action(
    manager: tauri::State<'_, Arc<InfrastructureManager>>,
    confirmation_token: String,
) -> Result<InfrastructureSnapshot, String> {
    let manager = Arc::clone(manager.inner());
    tauri::async_runtime::spawn_blocking(move || manager.confirm(&confirmation_token))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command(rename_all = "camelCase")]
async fn infrastructure_logs(
    manager: tauri::State<'_, Arc<InfrastructureManager>>,
    service_id: InfrastructureServiceId,
) -> Result<Vec<String>, String> {
    let manager = Arc::clone(manager.inner());
    tauri::async_runtime::spawn_blocking(move || manager.logs(service_id))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn infrastructure_migrations(
    operations: tauri::State<'_, OperationsState>,
    manager: tauri::State<'_, Arc<InfrastructureManager>>,
) -> Result<DatabaseMigrationSnapshot, String> {
    let workspace = operations.root()?;
    let manager = Arc::clone(manager.inner());
    tauri::async_runtime::spawn_blocking(move || manager.migrations(&workspace))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn preview_infrastructure_migrations(
    operations: tauri::State<'_, OperationsState>,
    manager: tauri::State<'_, Arc<InfrastructureManager>>,
) -> Result<DatabaseMigrationPreview, String> {
    let workspace = operations.root()?;
    let manager = Arc::clone(manager.inner());
    tauri::async_runtime::spawn_blocking(move || manager.preview_migrations(&workspace))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command(rename_all = "camelCase")]
async fn confirm_infrastructure_migrations(
    operations: tauri::State<'_, OperationsState>,
    manager: tauri::State<'_, Arc<InfrastructureManager>>,
    confirmation_token: String,
) -> Result<DatabaseMigrationSnapshot, String> {
    let workspace = operations.root()?;
    let manager = Arc::clone(manager.inner());
    tauri::async_runtime::spawn_blocking(move || {
        manager.confirm_migrations(&confirmation_token, &workspace)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn preview_infrastructure_seed(
    operations: tauri::State<'_, OperationsState>,
    manager: tauri::State<'_, Arc<InfrastructureManager>>,
) -> Result<DatabaseSeedPreview, String> {
    let workspace = operations.root()?;
    let manager = Arc::clone(manager.inner());
    tauri::async_runtime::spawn_blocking(move || manager.preview_seed(&workspace))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command(rename_all = "camelCase")]
async fn confirm_infrastructure_seed(
    operations: tauri::State<'_, OperationsState>,
    manager: tauri::State<'_, Arc<InfrastructureManager>>,
    confirmation_token: String,
) -> Result<(), String> {
    let workspace = operations.root()?;
    let manager = Arc::clone(manager.inner());
    tauri::async_runtime::spawn_blocking(move || {
        manager.confirm_seed(&confirmation_token, &workspace)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn infrastructure_event_diagnostics(
    manager: tauri::State<'_, Arc<InfrastructureManager>>,
) -> Result<Vec<EventQueueDiagnostic>, String> {
    let manager = Arc::clone(manager.inner());
    tauri::async_runtime::spawn_blocking(move || manager.event_diagnostics())
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn infrastructure_backups(
    manager: tauri::State<'_, Arc<InfrastructureManager>>,
) -> Result<Vec<BackupRecord>, String> {
    let manager = Arc::clone(manager.inner());
    tauri::async_runtime::spawn_blocking(move || manager.backups())
        .await
        .map_err(|error| error.to_string())?
}

fn unix_time_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .try_into()
        .unwrap_or(u64::MAX)
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
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ));
    let builder = if acceptance_mode() {
        builder
    } else {
        builder.plugin(shell::shortcut_plugin())
    };
    builder
        .manage(NativeState::new())
        .manage(OperationsState::discover())
        .manage(terminals)
        .manage(PreviewManager::default())
        .manage(activity)
        .manage(AwakeManager::new())
        .manage(SystemPulseService::new())
        .manage(NodeSweepService::default())
        .manage(GitService::default())
        .manage(UpdateManager::default())
        .manage(DoctorRemedyService::default())
        .setup(|app| {
            let default_config_dir = app.path().app_config_dir()?;
            let config_dir = resolve_acceptance_config_dir(
                &default_config_dir,
                &std::env::temp_dir(),
                std::env::var("MATRIZ_CONTROL_ACCEPTANCE").ok().as_deref(),
                std::env::var("MATRIZ_CONTROL_ACCEPTANCE_CONFIG_DIR")
                    .ok()
                    .as_deref(),
            );
            let settings_path = config_dir.join("settings.json");
            let settings = SettingsStore::at(settings_path);
            let saved = settings.read().unwrap_or_default();
            app.state::<OperationsState>()
                .restore_workspace(saved.workspace_path.as_deref());
            app.manage(settings);
            app.manage(HubStateStore::at(config_dir.join("hub-state.json")));
            app.manage(CommerceStore::new(config_dir.join("commerce.json")));
            app.manage(EnvironmentExportStore::at(config_dir.join("exports")));
            let infrastructure_root = app
                .path()
                .local_data_dir()?
                .join("Matriz")
                .join("Infrastructure");
            app.manage(Arc::new(InfrastructureManager::at(
                Box::new(PortableInfrastructureHost::new(infrastructure_root.clone())),
                infrastructure_root.to_string_lossy().into_owned(),
                unix_time_millis,
            )));
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
                } else {
                    window.app_handle().state::<AwakeManager>().shutdown();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_snapshot,
            get_runtime_snapshot,
            open_runtime_target,
            restart_runtime,
            recover_runtime,
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
            get_runbook_catalog,
            run_runbook,
            open_target,
            run_doctor,
            preview_doctor_remedy,
            confirm_doctor_remedy,
            get_workspace_pulse,
            get_git_snapshot,
            get_git_diff,
            stage_git_changes,
            unstage_git_changes,
            commit_git_changes,
            run_git_remote,
            run_git_branch,
            preview_git_merge,
            confirm_git_merge,
            abort_git_merge,
            get_system_pulse,
            get_awake_state,
            set_awake,
            scan_node_modules,
            delete_node_modules,
            read_resume_session,
            record_session_context,
            read_settings,
            write_settings,
            check_update,
            download_update,
            install_update,
            hide_window,
            quit_app,
            terminal_readiness,
            create_terminal,
            start_managed_operation,
            write_terminal,
            resize_terminal,
            interrupt_terminal,
            close_terminal,
            list_terminals,
            subscribe_terminal,
            infrastructure_snapshot,
            preview_infrastructure_action,
            confirm_infrastructure_action,
            infrastructure_logs,
            infrastructure_migrations,
            preview_infrastructure_migrations,
            confirm_infrastructure_migrations,
            preview_infrastructure_seed,
            confirm_infrastructure_seed,
            infrastructure_event_diagnostics,
            infrastructure_backups,
            get_native_app_runtime,
            install_native_app,
            start_native_app,
            stop_native_app,
            list_environments,
            read_environment,
            reveal_environment_value,
            save_environment,
            compare_environments,
            promote_environment,
            generate_environment_export,
            reveal_environment_export,
            find_environment_references,
            list_directory,
            preview_file,
            open_resource,
            reveal_resource,
            open_resource_in_editor,
            rename_resource,
            duplicate_resource,
            recycle_resource,
            get_commerce_snapshot,
            acquire_package,
            install_package,
            repair_package,
            uninstall_package,
            activate_package
        ])
        .run(tauri::generate_context!())
        .expect("Matriz Control native runtime failed");
}
