use std::{
    path::{Path, PathBuf},
    sync::mpsc,
};

use serde::Serialize;
use sysinfo::{Components, Disks, ProcessesToUpdate, System};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemPulse {
    pub cpu_usage: f32,
    pub cpu_model: String,
    pub used_memory_bytes: u64,
    pub total_memory_bytes: u64,
    pub available_memory_bytes: u64,
    pub uptime_seconds: u64,
    pub windows_version: String,
    pub hostname: Option<String>,
    pub disk_free_bytes: Option<u64>,
    pub disk_used_bytes: Option<u64>,
    pub process_count: usize,
    pub temperature_celsius: Option<f32>,
}

struct PulseState {
    system: System,
    disks: Disks,
    components: Components,
    samples: u8,
}

struct PulseRequest {
    workspace: Option<PathBuf>,
    reply: mpsc::Sender<Result<SystemPulse, String>>,
}

#[derive(Clone)]
pub struct SystemPulseService {
    sender: Option<mpsc::Sender<PulseRequest>>,
}

impl SystemPulseService {
    pub fn new() -> Self {
        let (sender, receiver) = mpsc::channel::<PulseRequest>();
        let worker = std::thread::Builder::new()
            .name("matriz-system-pulse".into())
            .spawn(move || {
                // sysinfo may initialize COM on Windows, so it must never be constructed
                // on Tauri's WebView/UI thread.
                let mut state = PulseState {
                    system: System::new_all(),
                    disks: Disks::new_with_refreshed_list(),
                    components: Components::new_with_refreshed_list(),
                    samples: 0,
                };
                while let Ok(request) = receiver.recv() {
                    let _ = request
                        .reply
                        .send(snapshot(&mut state, request.workspace.as_deref()));
                }
            });
        Self {
            sender: worker.ok().map(|_| sender),
        }
    }

    pub fn snapshot(&self, workspace: Option<&Path>) -> Result<SystemPulse, String> {
        let sender = self
            .sender
            .as_ref()
            .ok_or("System Pulse worker could not be created")?;
        let (reply, result) = mpsc::channel();
        sender
            .send(PulseRequest {
                workspace: workspace.map(Path::to_path_buf),
                reply,
            })
            .map_err(|_| "System Pulse worker is unavailable")?;
        result
            .recv()
            .map_err(|_| "System Pulse worker did not respond")?
    }
}

fn snapshot(state: &mut PulseState, workspace: Option<&Path>) -> Result<SystemPulse, String> {
    state.system.refresh_cpu_usage();
    state.system.refresh_memory();
    state.samples = state.samples.wrapping_add(1);
    if state.samples == 1 || state.samples % 10 == 0 {
        state.system.refresh_processes(ProcessesToUpdate::All, true);
        state.disks.refresh(true);
        state.components.refresh(true);
    }
    let cpu_model = state
        .system
        .cpus()
        .first()
        .map(|cpu| cpu.brand().trim().to_owned())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "Unknown CPU".into());
    let disk = workspace
        .and_then(|path| {
            state
                .disks
                .iter()
                .filter(|disk| path.starts_with(disk.mount_point()))
                .max_by_key(|disk| disk.mount_point().components().count())
        })
        .or_else(|| state.disks.iter().next());
    let disk_free_bytes = disk.map(|value| value.available_space());
    let disk_used_bytes =
        disk.map(|value| value.total_space().saturating_sub(value.available_space()));
    let temperature_celsius = state
        .components
        .iter()
        .filter_map(|component| component.temperature())
        .filter(|value| value.is_finite() && *value > 0.0 && *value <= 150.0)
        .max_by(|left, right| left.total_cmp(right));
    Ok(SystemPulse {
        cpu_usage: state.system.global_cpu_usage(),
        cpu_model,
        used_memory_bytes: state.system.used_memory(),
        total_memory_bytes: state.system.total_memory(),
        available_memory_bytes: state.system.available_memory(),
        uptime_seconds: System::uptime(),
        windows_version: System::long_os_version()
            .or_else(System::os_version)
            .unwrap_or_else(|| "Windows".into()),
        hostname: System::host_name(),
        disk_free_bytes,
        disk_used_bytes,
        process_count: state.system.processes().len(),
        temperature_celsius,
    })
}

impl Default for SystemPulseService {
    fn default() -> Self {
        Self::new()
    }
}
