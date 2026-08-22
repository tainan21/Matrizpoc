use std::{
    process::Command,
    thread,
    time::{Duration, Instant},
};

use serde::Serialize;

use crate::{terminal::corepack_pnpm_command, workspace::OperationsState};

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
    args: &[String],
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
    let deadline = Instant::now() + Duration::from_secs(15);
    loop {
        if let Some(status) = child.try_wait().map_err(|error| error.to_string())? {
            return status
                .success()
                .then(|| "available".to_owned())
                .ok_or_else(|| "failed".to_owned());
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
    let cwd = workspace.as_ref().ok().cloned();
    let pnpm = corepack_pnpm_command(&["--version".to_owned()]);
    let handles = [
        Ok(("node", "node.exe".to_owned(), vec!["--version".to_owned()])),
        pnpm.map(|(program, args)| ("pnpm", program, args)),
        Ok(("git", "git.exe".to_owned(), vec!["--version".to_owned()])),
    ]
    .into_iter()
    .map(|command| {
        let cwd = cwd.clone();
        thread::spawn(move || {
            let (id, result) = match command {
                Ok((id, program, args)) => (id, fixed_output(&program, &args, cwd.as_deref())),
                Err(error) => ("pnpm", Err(error)),
            };
            DoctorCheck {
                id,
                ok: result.is_ok(),
                value: result.unwrap_or_else(|error| error),
            }
        })
    })
    .collect::<Vec<_>>();
    checks.extend(
        handles
            .into_iter()
            .map(|handle| handle.join().expect("doctor worker panicked")),
    );
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

#[cfg(all(test, windows))]
mod tests {
    use super::{corepack_pnpm_command, fixed_output};

    #[test]
    fn doctor_requires_a_successful_tool_exit_code() {
        assert_eq!(
            fixed_output(
                "cmd.exe",
                &["/D".into(), "/C".into(), "exit 0".into()],
                None
            ),
            Ok("available".into())
        );
        assert_eq!(
            fixed_output(
                "cmd.exe",
                &["/D".into(), "/C".into(), "exit 7".into()],
                None
            ),
            Err("failed".into())
        );
    }

    #[test]
    fn doctor_pnpm_uses_the_safe_corepack_runtime() {
        let (program, args) =
            corepack_pnpm_command(&["--version".to_owned()]).expect("corepack runtime");

        assert!(std::path::Path::new(&program).is_absolute());
        assert!(std::path::Path::new(&args[0]).is_file());
        assert_eq!(&args[1..], ["pnpm", "--version"]);
    }
}
