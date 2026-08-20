use std::{
    path::{Path, PathBuf},
    process::Command,
};

use serde::Serialize;
use sha2::{Digest, Sha256};

use crate::processes::{ProcessTerminator, WindowsProcessTerminator};

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

fn installer_hash_path(installer: &Path) -> PathBuf {
    PathBuf::from(format!("{}.sha256", installer.display()))
}

fn verify_installer(root: &Path, installer: &Path) -> Result<PathBuf, String> {
    let canonical_root = root
        .canonicalize()
        .map_err(|error| format!("Unable to resolve Matriz workspace: {error}"))?;
    let canonical_installer = installer
        .canonicalize()
        .map_err(|error| format!("Matriz Admin installer is unavailable: {error}"))?;
    if !canonical_installer.starts_with(&canonical_root) {
        return Err("Matriz Admin installer resolved outside the workspace".into());
    }
    let expected = std::fs::read_to_string(installer_hash_path(installer))
        .map_err(|_| "Matriz Admin installer trust hash is missing".to_owned())?;
    let expected = expected.trim();
    if expected.len() != 64 || !expected.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err("Matriz Admin installer trust hash is invalid".into());
    }
    let bytes = std::fs::read(&canonical_installer)
        .map_err(|error| format!("Unable to read Matriz Admin installer: {error}"))?;
    let actual = format!("{:x}", Sha256::digest(bytes));
    if !actual.eq_ignore_ascii_case(expected) {
        return Err("Matriz Admin installer failed integrity verification".into());
    }
    Ok(canonical_installer)
}

fn installed_candidates() -> Vec<PathBuf> {
    let base = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_default();
    let mut candidates = registered_install_locations()
        .into_iter()
        .map(|directory| directory.join(MATRIZ_ADMIN_EXECUTABLE))
        .collect::<Vec<_>>();
    candidates.extend([
        base.join("Matriz Admin").join(MATRIZ_ADMIN_EXECUTABLE),
        base.join("Programs/Matriz Admin")
            .join(MATRIZ_ADMIN_EXECUTABLE),
    ]);
    candidates
}

#[cfg(windows)]
fn registered_install_locations() -> Vec<PathBuf> {
    use winreg::{HKCU, HKLM};

    const KEY: &str = "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Matriz Admin";
    [HKCU, HKLM]
        .into_iter()
        .filter_map(|hive| hive.open_subkey(KEY).ok())
        .filter_map(|key| key.get_value::<String, _>("InstallLocation").ok())
        .map(|value| normalize_registered_location(&value))
        .collect()
}

#[cfg(not(windows))]
fn registered_install_locations() -> Vec<PathBuf> {
    Vec::new()
}

fn normalize_registered_location(value: &str) -> PathBuf {
    PathBuf::from(value.trim().trim_matches('"'))
}

fn installed_path() -> Option<PathBuf> {
    installed_candidates()
        .into_iter()
        .find(|path| path.is_file())
}

#[cfg(windows)]
fn native_process_ids() -> Vec<u32> {
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
            return Vec::new();
        }
        let mut entry: PROCESSENTRY32W = std::mem::zeroed();
        entry.dwSize = size_of::<PROCESSENTRY32W>() as u32;
        let mut process_ids = Vec::new();
        if Process32FirstW(snapshot, &mut entry) != 0 {
            loop {
                let length = entry
                    .szExeFile
                    .iter()
                    .position(|value| *value == 0)
                    .unwrap_or(entry.szExeFile.len());
                let name = String::from_utf16_lossy(&entry.szExeFile[..length]);
                if name.eq_ignore_ascii_case(MATRIZ_ADMIN_EXECUTABLE) {
                    process_ids.push(entry.th32ProcessID);
                }
                if Process32NextW(snapshot, &mut entry) == 0 {
                    break;
                }
            }
        }
        CloseHandle(snapshot);
        process_ids
    }
}

#[cfg(not(windows))]
fn native_process_ids() -> Vec<u32> {
    Vec::new()
}

fn is_running() -> bool {
    !native_process_ids().is_empty()
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
    let installer = verify_installer(root, &installer_path(root))?;
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

pub fn stop(root: &Path) -> Result<NativeAppRuntime, String> {
    let process_ids = native_process_ids();
    if process_ids.is_empty() {
        return Err("Matriz Admin is not running".into());
    }
    for pid in process_ids {
        WindowsProcessTerminator.terminate(pid)?;
    }
    let mut result = runtime(root);
    result.state = if installed_path().is_some() {
        NativeAppState::Installed
    } else {
        NativeAppState::NotBuilt
    };
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::{installer_hash_path, normalize_registered_location, verify_installer};
    use sha2::{Digest, Sha256};
    use std::{fs, path::PathBuf};

    #[test]
    fn normalizes_nsis_install_locations_with_quotes() {
        assert_eq!(
            normalize_registered_location("  \"C:\\Custom\\Matriz Admin\"  "),
            PathBuf::from("C:\\Custom\\Matriz Admin")
        );
    }

    #[test]
    fn rejects_an_installer_when_its_trusted_hash_no_longer_matches() {
        let root = tempfile::tempdir().expect("workspace");
        let installer = root.path().join("admin-setup.exe");
        fs::write(&installer, b"trusted").expect("installer fixture");
        fs::write(
            installer_hash_path(&installer),
            format!("{:x}", Sha256::digest(b"trusted")),
        )
        .expect("hash fixture");
        assert!(verify_installer(root.path(), &installer).is_ok());

        fs::write(&installer, b"tampered").expect("tampered fixture");
        assert_eq!(
            verify_installer(root.path(), &installer),
            Err("Matriz Admin installer failed integrity verification".into())
        );

        let copied = tempfile::tempdir().expect("copied installer directory");
        let copied_installer = copied.path().join("admin-setup.exe");
        fs::write(&copied_installer, b"trusted").expect("copied installer");
        fs::write(
            installer_hash_path(&copied_installer),
            format!("{:x}", Sha256::digest(b"trusted")),
        )
        .expect("copied hash");
        assert_eq!(
            verify_installer(root.path(), &copied_installer),
            Err("Matriz Admin installer resolved outside the workspace".into())
        );
    }
}
