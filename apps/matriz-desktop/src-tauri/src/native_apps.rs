use std::{
    path::{Path, PathBuf},
    process::Command,
};

use serde::Serialize;

const MATRIZ_ADMIN_EXECUTABLE: &str = "matriz-admin-desktop.exe";

pub fn native_executable_name() -> &'static str {
    MATRIZ_ADMIN_EXECUTABLE
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum NativeAppState {
    NotBuilt,
    Built,
    Installed,
    Running,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeAppRuntime {
    pub app_id: &'static str,
    pub state: NativeAppState,
    pub version: &'static str,
}

pub fn classify_native_app(installer: bool, installed: bool, running: bool) -> NativeAppState {
    if installed && running {
        NativeAppState::Running
    } else if installed {
        NativeAppState::Installed
    } else if installer {
        NativeAppState::Built
    } else {
        NativeAppState::NotBuilt
    }
}

fn installer_path(root: &Path) -> PathBuf {
    root.join("apps/matriz-admin/desktop/src-tauri/target/release/bundle/nsis/Matriz Admin_0.1.0_x64-setup.exe")
}

fn installed_candidates() -> Vec<PathBuf> {
    let base = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_default();
    vec![
        base.join("Matriz Admin").join(MATRIZ_ADMIN_EXECUTABLE),
        base.join("Programs/Matriz Admin")
            .join(MATRIZ_ADMIN_EXECUTABLE),
    ]
}

fn installed_path() -> Option<PathBuf> {
    installed_candidates()
        .into_iter()
        .find(|path| path.is_file())
}

#[cfg(windows)]
fn is_running() -> bool {
    use std::mem::size_of;
    use windows_sys::Win32::{
        Foundation::{CloseHandle, INVALID_HANDLE_VALUE},
        System::Diagnostics::ToolHelp::{
            CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
            TH32CS_SNAPPROCESS,
        },
    };

    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snapshot == INVALID_HANDLE_VALUE {
            return false;
        }
        let mut entry: PROCESSENTRY32W = std::mem::zeroed();
        entry.dwSize = size_of::<PROCESSENTRY32W>() as u32;
        let mut found = false;
        if Process32FirstW(snapshot, &mut entry) != 0 {
            loop {
                let length = entry
                    .szExeFile
                    .iter()
                    .position(|value| *value == 0)
                    .unwrap_or(entry.szExeFile.len());
                let name = String::from_utf16_lossy(&entry.szExeFile[..length]);
                if name.eq_ignore_ascii_case(MATRIZ_ADMIN_EXECUTABLE) {
                    found = true;
                    break;
                }
                if Process32NextW(snapshot, &mut entry) == 0 {
                    break;
                }
            }
        }
        CloseHandle(snapshot);
        found
    }
}

#[cfg(not(windows))]
fn is_running() -> bool {
    false
}

pub fn runtime(root: &Path) -> NativeAppRuntime {
    let installed = installed_path().is_some();
    NativeAppRuntime {
        app_id: "matriz-admin",
        state: classify_native_app(installer_path(root).is_file(), installed, is_running()),
        version: "0.1.0",
    }
}

pub fn install(root: &Path) -> Result<NativeAppRuntime, String> {
    let installer = installer_path(root);
    if !installer.is_file() {
        return Err("Matriz Admin installer has not been built".into());
    }
    let status = Command::new(&installer)
        .arg("/S")
        .status()
        .map_err(|error| format!("Unable to install Matriz Admin: {error}"))?;
    if !status.success() {
        return Err(format!("Matriz Admin installer exited with {status}"));
    }
    Ok(runtime(root))
}

pub fn start(root: &Path) -> Result<NativeAppRuntime, String> {
    let executable = installed_path().ok_or_else(|| "Matriz Admin is not installed".to_string())?;
    Command::new(executable)
        .spawn()
        .map_err(|error| format!("Unable to start Matriz Admin: {error}"))?;
    let mut result = runtime(root);
    result.state = NativeAppState::Running;
    Ok(result)
}
