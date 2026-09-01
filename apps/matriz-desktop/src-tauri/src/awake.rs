use std::sync::{Arc, Mutex};

pub trait AwakeApi: Send + Sync + 'static {
    fn apply(&self, enabled: bool) -> Result<(), String>;
}

pub struct AwakeManager<A = WindowsAwakeApi> {
    api: A,
    enabled: Arc<Mutex<bool>>,
}

impl AwakeManager<WindowsAwakeApi> {
    pub fn new() -> Self {
        Self::with_api(WindowsAwakeApi::new())
    }
}

impl Default for AwakeManager<WindowsAwakeApi> {
    fn default() -> Self {
        Self::new()
    }
}

impl<A: AwakeApi> AwakeManager<A> {
    pub fn with_api(api: A) -> Self {
        Self {
            api,
            enabled: Arc::new(Mutex::new(false)),
        }
    }

    pub fn enabled(&self) -> bool {
        self.enabled.lock().map(|value| *value).unwrap_or(false)
    }

    pub fn set_enabled(&self, enabled: bool) -> Result<bool, String> {
        self.api.apply(enabled)?;
        *self
            .enabled
            .lock()
            .map_err(|_| "Awake state lock poisoned")? = enabled;
        Ok(enabled)
    }

    pub fn shutdown(&self) {
        let _ = self.api.apply(false);
        if let Ok(mut value) = self.enabled.lock() {
            *value = false;
        }
    }
}

#[cfg(windows)]
enum WorkerCommand {
    Apply(bool, std::sync::mpsc::Sender<Result<(), String>>),
    Shutdown,
}

#[cfg(windows)]
pub struct WindowsAwakeApi {
    sender: Option<std::sync::mpsc::Sender<WorkerCommand>>,
    worker: Mutex<Option<std::thread::JoinHandle<()>>>,
}

#[cfg(windows)]
impl WindowsAwakeApi {
    fn new() -> Self {
        let (sender, receiver) = std::sync::mpsc::channel();
        let worker = std::thread::Builder::new()
            .name("matriz-awake".into())
            .spawn(move || {
                use windows_sys::Win32::System::Power::{
                    SetThreadExecutionState, ES_CONTINUOUS, ES_SYSTEM_REQUIRED,
                };
                let apply = |enabled| {
                    let flags = if enabled {
                        ES_CONTINUOUS | ES_SYSTEM_REQUIRED
                    } else {
                        ES_CONTINUOUS
                    };
                    if unsafe { SetThreadExecutionState(flags) } == 0 {
                        Err(format!(
                            "Windows awake API failed: {}",
                            std::io::Error::last_os_error()
                        ))
                    } else {
                        Ok(())
                    }
                };
                while let Ok(command) = receiver.recv() {
                    match command {
                        WorkerCommand::Apply(enabled, reply) => {
                            let _ = reply.send(apply(enabled));
                        }
                        WorkerCommand::Shutdown => {
                            let _ = apply(false);
                            break;
                        }
                    }
                }
            })
            .ok();
        Self {
            sender: worker.as_ref().map(|_| sender),
            worker: Mutex::new(worker),
        }
    }
}

#[cfg(windows)]
impl AwakeApi for WindowsAwakeApi {
    fn apply(&self, enabled: bool) -> Result<(), String> {
        let (reply, result) = std::sync::mpsc::channel();
        self.sender
            .as_ref()
            .ok_or("Matriz Awake worker could not be created")?
            .send(WorkerCommand::Apply(enabled, reply))
            .map_err(|_| "Matriz Awake worker is unavailable")?;
        result
            .recv()
            .map_err(|_| "Matriz Awake worker did not respond")?
    }
}

#[cfg(windows)]
impl Drop for WindowsAwakeApi {
    fn drop(&mut self) {
        if let Some(sender) = &self.sender {
            let _ = sender.send(WorkerCommand::Shutdown);
        }
        if let Ok(mut worker) = self.worker.lock() {
            if let Some(handle) = worker.take() {
                let _ = handle.join();
            }
        }
    }
}

#[cfg(not(windows))]
pub struct WindowsAwakeApi;

#[cfg(not(windows))]
impl WindowsAwakeApi {
    fn new() -> Self {
        Self
    }
}

#[cfg(not(windows))]
impl AwakeApi for WindowsAwakeApi {
    fn apply(&self, _enabled: bool) -> Result<(), String> {
        Err("Keep Awake is available only on Windows".into())
    }
}
