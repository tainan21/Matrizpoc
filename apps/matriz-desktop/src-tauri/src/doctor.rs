use std::{
    process::Command,
    thread,
    time::{Duration, Instant},
};

use serde::Serialize;

use crate::workspace::OperationsState;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DoctorCheck {
    pub id: &'static str,
    pub ok: bool,
    pub value: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspacePulse {
    pub branch: String,
    pub changed_files: usize,
    pub clean: bool,
}

fn fixed_output(
    program: &str,
    args: &[&str],
    cwd: Option<&std::path::Path>,
) -> Result<String, String> {
    let mut command = Command::new(program);
    command.args(args);
    if let Some(cwd) = cwd {
        command.current_dir(cwd);
    }
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);
    let mut child = command.spawn().map_err(|error| error.to_string())?;
    let deadline = Instant::now() + Duration::from_secs(5);
    loop {
        if let Some(status) = child.try_wait().map_err(|error| error.to_string())? {
            return Ok(if status.success() {
                "available"
            } else {
                "failed"
            }
            .into());
        }
        if Instant::now() >= deadline {
            let _ = child.kill();
            return Err("timed out".into());
        }
        thread::sleep(Duration::from_millis(25));
    }
}

pub fn run_doctor(state: &OperationsState) -> Vec<DoctorCheck> {
    let workspace = state.root();
    let mut checks = vec![DoctorCheck {
        id: "workspace",
        ok: workspace.is_ok(),
        value: workspace
            .as_ref()
            .map(|path| path.display().to_string())
            .unwrap_or_else(|error| error.clone()),
    }];
    for (id, program, args) in [
        ("node", "node.exe", ["--version"].as_slice()),
        ("pnpm", "pnpm.cmd", ["--version"].as_slice()),
        ("git", "git.exe", ["--version"].as_slice()),
    ] {
        let result = fixed_output(
            program,
            args,
            workspace.as_ref().ok().map(std::path::PathBuf::as_path),
        );
        checks.push(DoctorCheck {
            id,
            ok: result.is_ok(),
            value: result.unwrap_or_else(|error| error),
        });
    }
    checks
}

pub fn workspace_pulse(state: &OperationsState) -> Result<WorkspacePulse, String> {
    let root = state.root()?;
    let output = Command::new("git.exe")
        .current_dir(root)
        .args(["status", "--short", "--branch"])
        .output()
        .map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err("git status failed".into());
    }
    let text = String::from_utf8_lossy(&output.stdout);
    let mut lines = text.lines();
    let branch = lines
        .next()
        .unwrap_or("## unknown")
        .trim_start_matches("## ")
        .split("...")
        .next()
        .unwrap_or("unknown")
        .to_owned();
    let changed_files = lines.count();
    Ok(WorkspacePulse {
        branch,
        changed_files,
        clean: changed_files == 0,
    })
}
