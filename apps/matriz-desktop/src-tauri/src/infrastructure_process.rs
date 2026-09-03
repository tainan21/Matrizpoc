//! Native launch receipts are not inferred from a listening port or executable name.
use serde::{Deserialize, Serialize};
use std::{
    fs,
    os::windows::{ffi::OsStrExt, io::AsRawHandle},
    path::{Path, PathBuf},
    process::Child,
};
use windows_sys::Win32::{
    Foundation::{CloseHandle, FILETIME, HANDLE, WAIT_OBJECT_0},
    Storage::FileSystem::{MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH},
    System::Threading::{
        GetProcessTimes, OpenProcess, QueryFullProcessImageNameW, TerminateProcess,
        WaitForSingleObject, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_SYNCHRONIZE,
        PROCESS_TERMINATE,
    },
};

#[derive(Debug, Deserialize, Serialize, PartialEq)]
struct LaunchReceipt {
    version: u8,
    pid: u32,
    created_at: u64,
    executable: PathBuf,
    sha256: String,
}

fn identity(handle: HANDLE, pid: u32, expected: &Path) -> Result<LaunchReceipt, String> {
    let mut creation: FILETIME = unsafe { std::mem::zeroed() };
    let mut exit = creation;
    let mut kernel = creation;
    let mut user = creation;
    if unsafe { GetProcessTimes(handle, &mut creation, &mut exit, &mut kernel, &mut user) } == 0 {
        return Err("Não foi possível verificar a criação do processo".into());
    }
    let mut name = vec![0u16; 32768];
    let mut length = name.len() as u32;
    if unsafe { QueryFullProcessImageNameW(handle, 0, name.as_mut_ptr(), &mut length) } == 0 {
        return Err("Não foi possível verificar o executável do processo".into());
    }
    let executable = PathBuf::from(String::from_utf16_lossy(&name[..length as usize]))
        .canonicalize()
        .map_err(|error| error.to_string())?;
    if executable != expected.canonicalize().map_err(|error| error.to_string())? {
        return Err("O executável não pertence ao serviço esperado".into());
    }
    Ok(LaunchReceipt {
        version: 1,
        pid,
        created_at: (u64::from(creation.dwHighDateTime) << 32) | u64::from(creation.dwLowDateTime),
        sha256: super::sha256_file(&executable)?,
        executable,
    })
}

pub(super) fn record(child: &Child, expected: &Path, path: &Path) -> Result<(), String> {
    // The spawn handle, rather than a second PID lookup, identifies the launched instance.
    let receipt = identity(child.as_raw_handle() as HANDLE, child.id(), expected)?;
    let parent = path.parent().ok_or("Registro de processo inválido")?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    let temporary = parent.join(format!(".launch-{}.tmp", uuid::Uuid::new_v4()));
    super::write_new_file(
        &temporary,
        &serde_json::to_vec(&receipt).map_err(|error| error.to_string())?,
    )?;
    let from: Vec<u16> = temporary.as_os_str().encode_wide().chain(Some(0)).collect();
    let to: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
    if unsafe {
        MoveFileExW(
            from.as_ptr(),
            to.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    } == 0
    {
        let error = std::io::Error::last_os_error().to_string();
        let _ = fs::remove_file(&temporary);
        return Err(error);
    }
    Ok(())
}

pub(super) struct VerifiedProcess(HANDLE);

impl Drop for VerifiedProcess {
    fn drop(&mut self) {
        unsafe { CloseHandle(self.0) };
    }
}

impl VerifiedProcess {
    pub(super) fn recover(expected: &Path, path: &Path, stopping: bool) -> Option<Self> {
        let receipt: LaunchReceipt = serde_json::from_slice(&fs::read(path).ok()?).ok()?;
        Self::open(receipt.pid, expected, path, stopping).ok()
    }

    pub(super) fn open(
        pid: u32,
        expected: &Path,
        path: &Path,
        stopping: bool,
    ) -> Result<Self, String> {
        let bytes =
            fs::read(path).map_err(|_| "Processo sem registro de inicialização do Control")?;
        let receipt: LaunchReceipt =
            serde_json::from_slice(&bytes).map_err(|_| "Registro de inicialização inválido")?;
        let rights = PROCESS_QUERY_LIMITED_INFORMATION
            | PROCESS_SYNCHRONIZE
            | if stopping { PROCESS_TERMINATE } else { 0 };
        let handle = unsafe { OpenProcess(rights, 0, pid) };
        if handle.is_null() {
            return Err("Não foi possível verificar o processo observado".into());
        }
        let owned = Self(handle);
        if identity(handle, pid, expected)? != receipt {
            return Err("PID, criação ou executável divergem do registro do Control".into());
        }
        if unsafe { WaitForSingleObject(handle, 0) } == WAIT_OBJECT_0 {
            return Err("O processo registrado já encerrou".into());
        }
        Ok(owned)
    }

    pub(super) fn terminate(self) -> Result<(), String> {
        // Validation and termination share the same handle, preventing PID-reuse races.
        if unsafe { TerminateProcess(self.0, 1) } == 0 {
            return Err("Windows recusou encerrar o processo validado".into());
        }
        if unsafe { WaitForSingleObject(self.0, 5000) } != WAIT_OBJECT_0 {
            return Err("O processo validado ainda não confirmou encerramento".into());
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        os::windows::process::CommandExt,
        process::{Command, Stdio},
    };

    struct ChildGuard(Child);
    impl Drop for ChildGuard {
        fn drop(&mut self) {
            let _ = self.0.kill();
            let _ = self.0.wait();
        }
    }

    #[test]
    fn recovered_receipt_checks_creation_pid_path_hash_and_version_before_stopping() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("process.json");
        let executable = PathBuf::from(std::env::var_os("SystemRoot").unwrap())
            .join("System32/WindowsPowerShell/v1.0/powershell.exe");
        let mut child = ChildGuard(
            Command::new(&executable)
                .args([
                    "-NoProfile",
                    "-NonInteractive",
                    "-Command",
                    "Start-Sleep -Seconds 60",
                ])
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .creation_flags(0x0800_0000)
                .spawn()
                .unwrap(),
        );
        record(&child.0, &executable, &path).unwrap();
        let valid = fs::read(&path).unwrap();
        for field in ["version", "pid", "created_at", "executable", "sha256"] {
            let mut altered: serde_json::Value = serde_json::from_slice(&valid).unwrap();
            altered[field] = match field {
                "executable" | "sha256" => serde_json::json!("different"),
                _ => serde_json::json!(0),
            };
            fs::write(&path, serde_json::to_vec(&altered).unwrap()).unwrap();
            assert!(
                VerifiedProcess::open(child.0.id(), &executable, &path, true).is_err(),
                "accepted altered {field}"
            );
            assert!(child.0.try_wait().unwrap().is_none());
        }
        fs::write(&path, b"broken json").unwrap();
        assert!(VerifiedProcess::open(child.0.id(), &executable, &path, true).is_err());
        fs::write(&path, valid).unwrap();
        VerifiedProcess::open(child.0.id(), &executable, &path, true)
            .unwrap()
            .terminate()
            .unwrap();
        assert!(child.0.try_wait().unwrap().is_some());
        assert!(VerifiedProcess::open(child.0.id(), &executable, &path, false).is_err());
    }
}
