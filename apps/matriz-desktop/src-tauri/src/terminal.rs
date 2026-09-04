use std::{
    collections::HashMap,
    io::{Read, Write},
    path::{Path, PathBuf},
    process::Command,
    sync::{Arc, Mutex},
    thread,
};

use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use tauri::ipc::Channel;
use uuid::Uuid;

use crate::activity::ActivityHub;
use crate::catalog::{ManagedOperationDefinition, ManagedOperationKind};
use crate::processes::{terminate_process_tree, ManagedProcessJob};

pub const MAX_SESSIONS: usize = 6;
pub const MAX_CHUNK_BYTES: usize = 64 * 1024;
pub const MAX_TAIL_BYTES: usize = 256 * 1024;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct TerminalLimits {
    pub max_sessions: usize,
    pub max_chunk_bytes: usize,
    pub max_tail_bytes: usize,
}

impl Default for TerminalLimits {
    fn default() -> Self {
        Self {
            max_sessions: MAX_SESSIONS,
            max_chunk_bytes: MAX_CHUNK_BYTES,
            max_tail_bytes: MAX_TAIL_BYTES,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalSession {
    pub id: String,
    pub title: String,
    pub kind: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub operation_id: Option<String>,
    pub status: &'static str,
    pub cwd: String,
    pub exit_code: Option<u32>,
    pub tail: String,
    #[serde(skip)]
    pub process_id: Option<u32>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalReadiness {
    pub ready: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workspace_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shell_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shell_label: Option<String>,
    pub conpty_available: bool,
    pub session_count: usize,
    pub session_limit: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    tag = "event",
    content = "data"
)]
pub enum TerminalEvent {
    Output {
        session_id: String,
        sequence: u64,
        data: String,
    },
    State(TerminalSession),
    Closed {
        session_id: String,
    },
}

struct SessionRecord {
    metadata: TerminalSession,
    sequence: u64,
    pid: u32,
    job: Option<ManagedProcessJob>,
    master: Option<Box<dyn MasterPty + Send>>,
    writer: Option<Box<dyn Write + Send>>,
}

type SharedSession = Arc<Mutex<SessionRecord>>;
type Subscriber = Arc<Mutex<Option<Channel<TerminalEvent>>>>;

#[derive(Default)]
pub struct TerminalManager {
    sessions: Mutex<HashMap<String, SharedSession>>,
    subscriber: Subscriber,
    activity: ActivityHub,
}

impl TerminalManager {
    pub fn with_activity(activity: ActivityHub) -> Self {
        Self {
            activity,
            ..Self::default()
        }
    }

    pub fn create_shell(&self, root: &Path) -> Result<TerminalSession, String> {
        let shell = preferred_shell();
        self.spawn(root, shell_label(&shell), "shell", None, &shell, &[])
    }

    pub fn readiness(
        &self,
        workspace: Result<PathBuf, String>,
    ) -> Result<TerminalReadiness, String> {
        let session_count = self
            .sessions
            .lock()
            .map_err(|_| "Terminal lock poisoned")?
            .len();
        let (workspace_path, workspace_error) = match workspace {
            Ok(path) => (Some(path.display().to_string()), None),
            Err(error) => (None, Some(error)),
        };
        let shell = preferred_shell();
        let shell_available = Path::new(&shell).is_file();
        let conpty_available = native_pty_system()
            .openpty(PtySize {
                rows: 1,
                cols: 2,
                pixel_width: 0,
                pixel_height: 0,
            })
            .is_ok();
        let reason = workspace_error.or_else(|| {
            (!shell_available)
                .then(|| "PowerShell executable was not found".to_owned())
                .or_else(|| (!conpty_available).then(|| "Windows ConPTY is unavailable".to_owned()))
        });

        Ok(TerminalReadiness {
            ready: reason.is_none(),
            workspace_path,
            shell_path: shell_available.then_some(shell.clone()),
            shell_label: shell_available.then(|| shell_label(&shell).to_owned()),
            conpty_available,
            session_count,
            session_limit: MAX_SESSIONS,
            reason,
        })
    }

    pub fn start_managed(
        &self,
        root: &Path,
        operation: &ManagedOperationDefinition,
    ) -> Result<TerminalSession, String> {
        if operation.kind != ManagedOperationKind::Command {
            return Err("Native application operation is not a terminal command".into());
        }
        let program = operation
            .program
            .as_deref()
            .ok_or_else(|| "Managed operation has no executable".to_owned())?;
        let (program, args) = if program.eq_ignore_ascii_case("pnpm.cmd") {
            corepack_pnpm_command(&operation.args)?
        } else {
            (program.to_owned(), operation.args.clone())
        };
        self.spawn(
            root,
            &operation.title,
            "managed",
            Some(&operation.id),
            &program,
            &args,
        )
    }

    fn spawn(
        &self,
        root: &Path,
        title: &str,
        kind: &'static str,
        operation_id: Option<&str>,
        program: &str,
        args: &[String],
    ) -> Result<TerminalSession, String> {
        let mut sessions = self.sessions.lock().map_err(|_| "Terminal lock poisoned")?;
        if let Some(operation_id) = operation_id {
            for session in sessions.values() {
                let session = session
                    .lock()
                    .map_err(|_| "Terminal session lock poisoned")?;
                if session.metadata.operation_id.as_deref() == Some(operation_id)
                    && session.metadata.status == "running"
                {
                    return Ok(session.metadata.clone());
                }
            }
            if operation_id.starts_with("gate.") {
                for session in sessions.values() {
                    let session = session
                        .lock()
                        .map_err(|_| "Terminal session lock poisoned")?;
                    if session.metadata.status == "running"
                        && session
                            .metadata
                            .operation_id
                            .as_deref()
                            .is_some_and(|id| id.starts_with("gate."))
                    {
                        return Err("Another validation gate is already running".into());
                    }
                }
            }
        }
        if sessions.len() >= MAX_SESSIONS {
            return Err(format!("Terminal session limit reached ({MAX_SESSIONS})"));
        }

        let size = PtySize {
            rows: 30,
            cols: 100,
            pixel_width: 0,
            pixel_height: 0,
        };
        let pair = native_pty_system()
            .openpty(size)
            .map_err(|error| format!("Unable to create Windows terminal: {error}"))?;
        let mut command = CommandBuilder::new(program);
        command.args(args);
        command.cwd(external_process_cwd(root));
        if operation_id == Some("gate.prisma:validate") {
            command.env(
                "OPS_DATABASE_URL",
                std::env::var_os("OPS_DATABASE_URL").unwrap_or_else(|| {
                    "postgresql://validation:validation@127.0.0.1:1/validation?schema=ops".into()
                }),
            );
            command.env(
                "PAY_DATABASE_URL",
                std::env::var_os("PAY_DATABASE_URL").unwrap_or_else(|| {
                    "postgresql://validation:validation@127.0.0.1:1/validation?schema=pay".into()
                }),
            );
        }
        let mut child = pair
            .slave
            .spawn_command(command)
            .map_err(|error| format!("Unable to start terminal process: {error}"))?;
        drop(pair.slave);

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|error| format!("Unable to read terminal: {error}"))?;
        let writer = pair
            .master
            .take_writer()
            .map_err(|error| format!("Unable to write terminal: {error}"))?;
        let pid = child
            .process_id()
            .ok_or_else(|| "Terminal process did not expose a PID".to_owned())?;
        let job = ManagedProcessJob::assign(pid).ok();
        let id = Uuid::new_v4().to_string();
        let metadata = TerminalSession {
            id: id.clone(),
            title: title.to_owned(),
            kind,
            operation_id: operation_id.map(str::to_owned),
            status: "running",
            cwd: root.display().to_string(),
            exit_code: None,
            tail: String::new(),
            process_id: Some(pid),
        };
        let record = Arc::new(Mutex::new(SessionRecord {
            metadata: metadata.clone(),
            sequence: 0,
            pid,
            job,
            master: Some(pair.master),
            writer: Some(writer),
        }));
        sessions.insert(id.clone(), Arc::clone(&record));
        drop(sessions);

        let output_record = Arc::clone(&record);
        let output_subscriber = Arc::clone(&self.subscriber);
        thread::spawn(move || {
            let mut buffer = vec![0_u8; MAX_CHUNK_BYTES];
            loop {
                let count = match reader.read(&mut buffer) {
                    Ok(0) | Err(_) => break,
                    Ok(count) => count,
                };
                let data =
                    bounded_chunk(&String::from_utf8_lossy(&buffer[..count]), MAX_CHUNK_BYTES);
                let event = {
                    let mut session = match output_record.lock() {
                        Ok(session) => session,
                        Err(_) => break,
                    };
                    session.sequence += 1;
                    session.metadata.tail.push_str(&data);
                    session.metadata.tail = bounded_tail(&session.metadata.tail, MAX_TAIL_BYTES);
                    TerminalEvent::Output {
                        session_id: session.metadata.id.clone(),
                        sequence: session.sequence,
                        data,
                    }
                };
                send_event(&output_subscriber, event);
            }
        });

        let exit_record = Arc::clone(&record);
        let exit_subscriber = Arc::clone(&self.subscriber);
        let exit_activity = self.activity.clone();
        thread::spawn(move || {
            let status = child.wait();
            let metadata = {
                let mut session = match exit_record.lock() {
                    Ok(session) => session,
                    Err(_) => return,
                };
                if session.metadata.status == "closing" {
                    return;
                }
                match status {
                    Ok(status) => {
                        session.metadata.exit_code = Some(status.exit_code());
                        session.metadata.status = if status.success() {
                            "succeeded"
                        } else {
                            "failed"
                        };
                    }
                    Err(_) => session.metadata.status = "failed",
                }
                session.metadata.clone()
            };
            send_event(&exit_subscriber, TerminalEvent::State(metadata.clone()));
            let (kind, severity) = if metadata.status == "succeeded" {
                ("terminal.command.completed", "success")
            } else {
                ("terminal.command.failed", "error")
            };
            exit_activity.publish(
                kind,
                severity,
                &metadata.title,
                metadata
                    .exit_code
                    .map(|code| format!("Exit code {code}"))
                    .as_deref(),
                operation_app_id(metadata.operation_id.as_deref()),
            );
        });

        send_event(&self.subscriber, TerminalEvent::State(metadata.clone()));
        self.activity.publish(
            if kind == "managed" {
                "terminal.command.started"
            } else {
                "terminal.started"
            },
            "info",
            title,
            operation_id,
            operation_app_id(operation_id),
        );
        Ok(metadata)
    }

    pub fn list(&self) -> Result<Vec<TerminalSession>, String> {
        let sessions = self.sessions.lock().map_err(|_| "Terminal lock poisoned")?;
        sessions
            .values()
            .map(|session| {
                session
                    .lock()
                    .map(|session| session.metadata.clone())
                    .map_err(|_| "Terminal session lock poisoned".to_owned())
            })
            .collect()
    }

    pub fn session_id_for_operation(&self, operation_id: &str) -> Result<Option<String>, String> {
        Ok(self
            .list()?
            .into_iter()
            .find(|session| {
                session.operation_id.as_deref() == Some(operation_id)
                    && matches!(session.status, "running" | "starting")
            })
            .map(|session| session.id))
    }

    pub fn close_operation(&self, operation_id: &str) -> Result<bool, String> {
        let Some(session_id) = self.session_id_for_operation(operation_id)? else {
            return Ok(false);
        };
        self.close(&session_id)?;
        Ok(true)
    }

    pub fn write(&self, session_id: &str, data: &str) -> Result<(), String> {
        if data.len() > MAX_CHUNK_BYTES {
            return Err("Terminal input exceeds 64 KiB".into());
        }
        let session = self.session(session_id)?;
        let result = session
            .lock()
            .map_err(|_| "Terminal session lock poisoned".to_owned())?
            .writer
            .as_mut()
            .ok_or_else(|| "Terminal session is closing".to_owned())?
            .write_all(data.as_bytes())
            .map_err(|error| format!("Unable to write terminal: {error}"));
        result
    }

    pub fn resize(&self, session_id: &str, columns: u16, rows: u16) -> Result<(), String> {
        let size = normalize_size(columns, rows);
        self.session(session_id)?
            .lock()
            .map_err(|_| "Terminal session lock poisoned".to_owned())?
            .master
            .as_ref()
            .ok_or_else(|| "Terminal session is closing".to_owned())?
            .resize(size)
            .map_err(|error| format!("Unable to resize terminal: {error}"))
    }

    pub fn interrupt(&self, session_id: &str) -> Result<(), String> {
        self.write(session_id, "\u{3}")
    }

    pub fn close(&self, session_id: &str) -> Result<(), String> {
        let session = self.session(session_id)?;
        let (pid, has_job) = session
            .lock()
            .map(|session| (session.pid, session.job.is_some()))
            .map_err(|_| "Terminal session lock poisoned".to_owned())?;
        // Ctrl+C may complete a managed process just before its waiter publishes
        // the final state. Give that owned waiter a brief chance to win before
        // requesting PROCESS_TERMINATE for a process that is already exiting.
        let deadline = std::time::Instant::now() + std::time::Duration::from_millis(300);
        let is_running = loop {
            let running = session
                .lock()
                .map(|session| session.metadata.status == "running")
                .map_err(|_| "Terminal session lock poisoned".to_owned())?;
            if !running || std::time::Instant::now() >= deadline {
                break running;
            }
            std::thread::sleep(std::time::Duration::from_millis(10));
        };
        if is_running && !has_job {
            terminate_process_tree(pid)?;
        }
        let (writer, master) = {
            let mut session = session
                .lock()
                .map_err(|_| "Terminal session lock poisoned".to_owned())?;
            session.metadata.status = "closing";
            session.job.take();
            (session.writer.take(), session.master.take())
        };
        drop(writer);
        drop(master);
        self.sessions
            .lock()
            .map_err(|_| "Terminal lock poisoned")?
            .remove(session_id);
        send_event(
            &self.subscriber,
            TerminalEvent::Closed {
                session_id: session_id.to_owned(),
            },
        );
        Ok(())
    }

    pub fn subscribe(&self, channel: Channel<TerminalEvent>) -> Result<(), String> {
        *self
            .subscriber
            .lock()
            .map_err(|_| "Terminal subscriber lock poisoned")? = Some(channel);
        for session in self.list()? {
            send_event(&self.subscriber, TerminalEvent::State(session));
        }
        Ok(())
    }

    pub fn shutdown(&self) {
        let sessions = self
            .sessions
            .lock()
            .map(|mut sessions| {
                sessions
                    .drain()
                    .map(|(_, session)| session)
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        for session in sessions {
            if let Ok(mut session) = session.lock() {
                if session.metadata.status == "running" && session.job.is_none() {
                    let _ = terminate_process_tree(session.pid);
                }
                session.job.take();
                session.writer.take();
                session.master.take();
            }
        }
    }

    fn session(&self, session_id: &str) -> Result<SharedSession, String> {
        self.sessions
            .lock()
            .map_err(|_| "Terminal lock poisoned")?
            .get(session_id)
            .cloned()
            .ok_or_else(|| "Unknown terminal session".to_owned())
    }
}

pub fn external_process_cwd(path: &Path) -> PathBuf {
    let value = path.to_string_lossy();
    if let Some(network_path) = value.strip_prefix(r"\\?\UNC\") {
        return PathBuf::from(format!(r"\\{network_path}"));
    }
    if let Some(drive_path) = value.strip_prefix(r"\\?\") {
        return PathBuf::from(drive_path);
    }
    path.to_path_buf()
}

fn operation_app_id(operation_id: Option<&str>) -> Option<&str> {
    operation_id
        .and_then(|id| id.strip_prefix("app."))
        .and_then(|id| id.strip_suffix(".web"))
}

pub(crate) fn preferred_shell() -> String {
    ["pwsh.exe", "powershell.exe"]
        .into_iter()
        .find_map(resolve_executable)
        .unwrap_or_else(windows_powershell_fallback)
}

fn resolve_executable(name: &str) -> Option<String> {
    let output = Command::new("where.exe").arg(name).output().ok()?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(Path::new)
        .find(|path| path.is_absolute() && path.is_file())
        .map(|path| path.display().to_string())
}

fn resolve_node_22_executable() -> Option<String> {
    let output = Command::new("where.exe").arg("node.exe").output().ok()?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(Path::new)
        .filter(|path| path.is_absolute() && path.is_file())
        .find(|path| {
            Command::new(path)
                .arg("--version")
                .output()
                .ok()
                .filter(|result| result.status.success())
                .is_some_and(|result| {
                    String::from_utf8_lossy(&result.stdout)
                        .trim()
                        .starts_with("v22.")
                })
        })
        .map(|path| path.display().to_string())
}

fn windows_powershell_fallback() -> String {
    std::env::var_os("SystemRoot")
        .map(std::path::PathBuf::from)
        .map(|root| {
            root.join("System32/WindowsPowerShell/v1.0/powershell.exe")
                .display()
                .to_string()
        })
        .unwrap_or_else(|| "powershell.exe".to_owned())
}

pub(crate) fn corepack_pnpm_command(args: &[String]) -> Result<(String, Vec<String>), String> {
    let node = resolve_node_22_executable()
        .ok_or_else(|| "Compatible Node.js 22 executable was not found".to_owned())?;
    let corepack = Path::new(&node)
        .parent()
        .map(|directory| directory.join("node_modules/corepack/dist/corepack.js"))
        .filter(|path| path.is_file())
        .ok_or_else(|| "Corepack runtime was not found beside Node.js".to_owned())?;
    let mut corepack_args = vec![corepack.display().to_string(), "pnpm".to_owned()];
    corepack_args.extend_from_slice(args);
    Ok((node, corepack_args))
}

fn shell_label(shell: &str) -> &str {
    let executable = Path::new(shell)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or(shell);
    if executable.eq_ignore_ascii_case("pwsh.exe") {
        "PowerShell 7"
    } else {
        "PowerShell"
    }
}

fn send_event(subscriber: &Subscriber, event: TerminalEvent) {
    if let Ok(channel) = subscriber.lock() {
        if let Some(channel) = channel.as_ref() {
            let _ = channel.send(event);
        }
    }
}

pub fn normalize_size(columns: u16, rows: u16) -> PtySize {
    PtySize {
        cols: columns.clamp(2, 400),
        rows: rows.clamp(1, 200),
        pixel_width: 0,
        pixel_height: 0,
    }
}

pub fn validate_session_action(session_id: &str, known_ids: &[&str]) -> Result<(), String> {
    known_ids
        .contains(&session_id)
        .then_some(())
        .ok_or_else(|| "Unknown terminal session".to_owned())
}

pub fn bounded_chunk(value: &str, maximum: usize) -> String {
    if value.len() <= maximum {
        return value.to_owned();
    }
    let mut end = maximum;
    while !value.is_char_boundary(end) {
        end -= 1;
    }
    value[..end].to_owned()
}

pub fn bounded_tail(value: &str, maximum: usize) -> String {
    if value.len() <= maximum {
        return value.to_owned();
    }
    let mut start = value.len() - maximum;
    while !value.is_char_boundary(start) {
        start += 1;
    }
    value[start..].to_owned()
}

#[cfg(test)]
mod shell_tests {
    use super::{corepack_pnpm_command, preferred_shell, TerminalManager, MAX_SESSIONS};
    use std::path::Path;

    #[cfg(windows)]
    #[test]
    fn preferred_shell_resolves_to_an_existing_absolute_executable() {
        let shell = preferred_shell();
        let path = Path::new(&shell);
        assert!(path.is_absolute(), "resolved shell was {shell}");
        assert!(path.is_file(), "resolved shell did not exist: {shell}");
    }

    #[cfg(windows)]
    #[test]
    fn readiness_explains_missing_workspace_without_starting_a_shell() {
        let readiness = TerminalManager::default()
            .readiness(Err("Matriz workspace has not been selected".to_owned()))
            .expect("readiness");

        assert!(!readiness.ready);
        assert_eq!(readiness.workspace_path, None);
        assert!(readiness.shell_path.is_some());
        assert!(readiness.conpty_available);
        assert_eq!(readiness.session_count, 0);
        assert_eq!(readiness.session_limit, MAX_SESSIONS);
        assert_eq!(
            readiness.reason.as_deref(),
            Some("Matriz workspace has not been selected")
        );
    }

    #[cfg(windows)]
    #[test]
    fn managed_pnpm_uses_node_and_corepack_instead_of_a_batch_shim() {
        let (program, args) = corepack_pnpm_command(&["--version".to_owned()]).expect("corepack");

        assert!(Path::new(&program).is_absolute());
        assert!(Path::new(&program).is_file());
        assert!(Path::new(&args[0]).is_file());
        assert_eq!(&args[1..], ["pnpm", "--version"]);
    }
}
