use std::{
    collections::HashMap,
    io::{Read, Write},
    path::Path,
    process::Command,
    sync::{Arc, Mutex},
    thread,
};

use portable_pty::{native_pty_system, ChildKiller, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use tauri::ipc::Channel;
use uuid::Uuid;

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
    pub status: &'static str,
    pub cwd: String,
    pub exit_code: Option<u32>,
    pub tail: String,
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
    State {
        session: TerminalSession,
    },
}

struct SessionRecord {
    metadata: TerminalSession,
    sequence: u64,
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    killer: Box<dyn ChildKiller + Send + Sync>,
}

type SharedSession = Arc<Mutex<SessionRecord>>;
type Subscriber = Arc<Mutex<Option<Channel<TerminalEvent>>>>;

#[derive(Default)]
pub struct TerminalManager {
    sessions: Mutex<HashMap<String, SharedSession>>,
    subscriber: Subscriber,
}

impl TerminalManager {
    pub fn create_shell(&self, root: &Path) -> Result<TerminalSession, String> {
        let mut sessions = self.sessions.lock().map_err(|_| "Terminal lock poisoned")?;
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
        let shell = preferred_shell();
        let mut command = CommandBuilder::new(&shell);
        command.cwd(root);
        let mut child = pair
            .slave
            .spawn_command(command)
            .map_err(|error| format!("Unable to start PowerShell: {error}"))?;
        drop(pair.slave);

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|error| format!("Unable to read terminal: {error}"))?;
        let writer = pair
            .master
            .take_writer()
            .map_err(|error| format!("Unable to write terminal: {error}"))?;
        let killer = child.clone_killer();
        let id = Uuid::new_v4().to_string();
        let metadata = TerminalSession {
            id: id.clone(),
            title: shell_label(&shell).to_owned(),
            kind: "shell",
            status: "running",
            cwd: root.display().to_string(),
            exit_code: None,
            tail: String::new(),
        };
        let record = Arc::new(Mutex::new(SessionRecord {
            metadata: metadata.clone(),
            sequence: 0,
            master: pair.master,
            writer,
            killer,
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
        thread::spawn(move || {
            let status = child.wait();
            let metadata = {
                let mut session = match exit_record.lock() {
                    Ok(session) => session,
                    Err(_) => return,
                };
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
            send_event(&exit_subscriber, TerminalEvent::State { session: metadata });
        });

        send_event(
            &self.subscriber,
            TerminalEvent::State {
                session: metadata.clone(),
            },
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

    pub fn write(&self, session_id: &str, data: &str) -> Result<(), String> {
        if data.len() > MAX_CHUNK_BYTES {
            return Err("Terminal input exceeds 64 KiB".into());
        }
        let session = self.session(session_id)?;
        let result = session
            .lock()
            .map_err(|_| "Terminal session lock poisoned".to_owned())?
            .writer
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
            .resize(size)
            .map_err(|error| format!("Unable to resize terminal: {error}"))
    }

    pub fn interrupt(&self, session_id: &str) -> Result<(), String> {
        self.write(session_id, "\u{3}")
    }

    pub fn close(&self, session_id: &str) -> Result<(), String> {
        let session = self
            .sessions
            .lock()
            .map_err(|_| "Terminal lock poisoned")?
            .remove(session_id)
            .ok_or_else(|| "Unknown terminal session".to_owned())?;
        let result = session
            .lock()
            .map_err(|_| "Terminal session lock poisoned".to_owned())?
            .killer
            .kill()
            .map_err(|error| format!("Unable to close terminal: {error}"));
        result
    }

    pub fn subscribe(&self, channel: Channel<TerminalEvent>) -> Result<(), String> {
        *self
            .subscriber
            .lock()
            .map_err(|_| "Terminal subscriber lock poisoned")? = Some(channel);
        for session in self.list()? {
            send_event(&self.subscriber, TerminalEvent::State { session });
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
                let _ = session.killer.kill();
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

fn preferred_shell() -> String {
    Command::new("where.exe")
        .arg("pwsh.exe")
        .output()
        .ok()
        .filter(|output| output.status.success())
        .map(|_| "pwsh.exe")
        .unwrap_or("powershell.exe")
        .to_owned()
}

fn shell_label(shell: &str) -> &str {
    if shell.eq_ignore_ascii_case("pwsh.exe") {
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
