use std::{
    io::Read,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};

use serde::Serialize;

use crate::{terminal::corepack_pnpm_command, workspace::OperationsState};

#[cfg(windows)]
use std::os::windows::process::CommandExt;
#[cfg(windows)]
use winreg::{enums::*, RegKey};

const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DoctorCheck {
    pub id: &'static str,
    pub group: &'static str,
    pub label: &'static str,
    pub ok: bool,
    pub severity: &'static str,
    pub value: String,
    pub description: &'static str,
    pub expected: Option<&'static str>,
    pub remedy_id: Option<&'static str>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspacePulse {
    pub branch: String,
    pub changed_files: usize,
    pub clean: bool,
}

#[derive(Clone, Copy)]
enum VersionPolicy {
    Major(u32),
    Prefix(&'static [u32]),
}

struct ToolCommand {
    id: &'static str,
    label: &'static str,
    program: String,
    args: Vec<String>,
    expected: &'static str,
    policy: VersionPolicy,
}

#[cfg(test)]
fn fixed_output(program: &str, args: &[String], cwd: Option<&Path>) -> Result<String, String> {
    command_output(program, args, cwd).map(|_| "available".to_owned())
}

fn command_output(program: &str, args: &[String], cwd: Option<&Path>) -> Result<String, String> {
    let mut command = Command::new(program);
    command
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(cwd) = cwd {
        command.current_dir(cwd);
    }
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);
    let mut child = command.spawn().map_err(|error| error.to_string())?;
    let deadline = Instant::now() + Duration::from_secs(15);
    loop {
        if let Some(status) = child.try_wait().map_err(|error| error.to_string())? {
            let mut stdout = String::new();
            let mut stderr = String::new();
            if let Some(mut pipe) = child.stdout.take() {
                pipe.read_to_string(&mut stdout)
                    .map_err(|error| error.to_string())?;
            }
            if let Some(mut pipe) = child.stderr.take() {
                pipe.read_to_string(&mut stderr)
                    .map_err(|error| error.to_string())?;
            }
            let value = if stdout.trim().is_empty() {
                stderr.trim()
            } else {
                stdout.trim()
            };
            let first_line = value.lines().next().unwrap_or(value);
            return if status.success() {
                Ok(if first_line.is_empty() {
                    "available".to_owned()
                } else {
                    first_line.to_owned()
                })
            } else {
                Err(if first_line.is_empty() {
                    "failed".to_owned()
                } else {
                    first_line.to_owned()
                })
            };
        }
        if Instant::now() >= deadline {
            let _ = child.kill();
            return Err("timed out".into());
        }
        thread::sleep(Duration::from_millis(25));
    }
}

fn check(
    id: &'static str,
    group: &'static str,
    label: &'static str,
    result: Result<String, String>,
    description: &'static str,
    expected: Option<&'static str>,
    remedy_id: Option<&'static str>,
) -> DoctorCheck {
    let ok = result.is_ok();
    DoctorCheck {
        id,
        group,
        label,
        ok,
        severity: if ok { "success" } else { "error" },
        value: result.unwrap_or_else(|error| error),
        description,
        expected,
        remedy_id: if ok { None } else { remedy_id },
    }
}

fn tool_check(command: ToolCommand, cwd: Option<&Path>) -> DoctorCheck {
    let result = command_output(&command.program, &command.args, cwd).and_then(|value| {
        let supported = match command.policy {
            VersionPolicy::Major(major) => matches_major_version(&value, major),
            VersionPolicy::Prefix(parts) => matches_version_prefix(&value, parts),
        };
        supported
            .then_some(value.clone())
            .ok_or_else(|| format!("{value} · esperado {}", command.expected))
    });
    check(
        command.id,
        "Toolchain",
        command.label,
        result,
        "Ferramenta resolvida sem shell intermediário e validada pela versão suportada.",
        Some(command.expected),
        Some("repair-toolchain"),
    )
}

fn matches_major_version(value: &str, expected: u32) -> bool {
    version_parts(value)
        .first()
        .is_some_and(|major| *major == expected)
}

fn matches_version_prefix(value: &str, expected: &[u32]) -> bool {
    version_parts(value).starts_with(expected)
}

fn version_parts(value: &str) -> Vec<u32> {
    value
        .split(|character: char| !character.is_ascii_digit() && character != '.')
        .map(|token| token.trim_matches('.'))
        .filter(|token| token.contains('.'))
        .find_map(|token| {
            let parts = token
                .split('.')
                .map(str::parse::<u32>)
                .collect::<Result<Vec<_>, _>>()
                .ok()?;
            (!parts.is_empty()).then_some(parts)
        })
        .unwrap_or_default()
}

fn resolve_codex_runtime(
    plugin: Option<&Path>,
    desktop: Option<&Path>,
) -> Result<(&'static str, PathBuf), String> {
    if let Some(path) = plugin.filter(|path| path.is_file()) {
        return Ok(("plugin", path.to_path_buf()));
    }
    if let Some(path) = desktop.filter(|path| path.is_file()) {
        return Ok(("desktop", path.to_path_buf()));
    }
    Err("Codex não encontrado no plugin runtime nem no Desktop".into())
}

fn codex_check() -> DoctorCheck {
    let plugin = std::env::var_os("USERPROFILE")
        .map(PathBuf::from)
        .map(|root| root.join(".codex/plugins/.plugin-appserver/codex.exe"));
    let desktop = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .map(|root| root.join("OpenAI/Codex/bin/codex.exe"));
    let result = resolve_codex_runtime(plugin.as_deref(), desktop.as_deref())
        .map(|(source, path)| format!("{source} · {}", path.display()))
        .or_else(|_| {
            command_output("where.exe", &["codex.exe".into()], None)
                .or_else(|_| command_output("where.exe", &["codex.cmd".into()], None))
                .map(|path| format!("PATH · {path}"))
        });
    check(
        "codex",
        "Coworking",
        "Codex App Server",
        result,
        "Prioridade: runtime do plugin, Codex Desktop e, por último, PATH.",
        Some("Executável local confiável"),
        Some("repair-codex-runtime"),
    )
}

#[cfg(windows)]
fn webview2_version() -> Result<String, String> {
    let locations = [
        (HKEY_CURRENT_USER, r"Software\Microsoft\EdgeUpdate\Clients"),
        (
            HKEY_LOCAL_MACHINE,
            r"SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients",
        ),
        (HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\EdgeUpdate\Clients"),
    ];
    for (hive, location) in locations {
        let Ok(clients) = RegKey::predef(hive).open_subkey(location) else {
            continue;
        };
        for key in clients.enum_keys().flatten() {
            let Ok(client) = clients.open_subkey(key) else {
                continue;
            };
            let name: String = client.get_value("name").unwrap_or_default();
            if name.contains("WebView2") {
                let version: String = client.get_value("pv").unwrap_or_default();
                if !version.is_empty() {
                    return Ok(version);
                }
            }
        }
    }
    Err("Microsoft Edge WebView2 Runtime não encontrado".into())
}

#[cfg(not(windows))]
fn webview2_version() -> Result<String, String> {
    Err("WebView2 é suportado apenas no Windows".into())
}

pub fn run_doctor(state: &OperationsState) -> Vec<DoctorCheck> {
    let workspace = state.root();
    let mut checks = vec![
        check(
            "control",
            "Produto",
            "Matriz Control",
            Ok(format!("v{} · Tauri", env!("CARGO_PKG_VERSION"))),
            "Versão nativa oficial em execução.",
            Some("1.0.0"),
            None,
        ),
        check(
            "windows",
            "Sistema",
            "Windows",
            sysinfo::System::long_os_version().ok_or_else(|| "Versão indisponível".into()),
            "Sistema operacional que hospeda o Control.",
            Some("Windows x64 suportado"),
            None,
        ),
        check(
            "webview2",
            "Sistema",
            "WebView2",
            webview2_version(),
            "Runtime de renderização usado pelo Tauri.",
            Some("Runtime instalado"),
            Some("install-webview2"),
        ),
        check(
            "workspace",
            "Workspace",
            "Workspace Matriz",
            workspace
                .as_ref()
                .map(|path| path.display().to_string())
                .map_err(Clone::clone),
            "Raiz canônica validada pelos marcadores do monorepo.",
            Some("Workspace Matriz válido"),
            Some("select-workspace"),
        ),
    ];

    let cwd = workspace.as_ref().ok().cloned();
    let pnpm = corepack_pnpm_command(&["--version".to_owned()]);
    let commands = vec![
        Ok(ToolCommand {
            id: "node",
            label: "Node.js",
            program: "node.exe".into(),
            args: vec!["--version".into()],
            expected: "Major 22",
            policy: VersionPolicy::Major(22),
        }),
        pnpm.map(|(program, args)| ToolCommand {
            id: "pnpm",
            label: "Corepack / pnpm",
            program,
            args,
            expected: "Major 9",
            policy: VersionPolicy::Major(9),
        }),
        Ok(ToolCommand {
            id: "rust",
            label: "Rust",
            program: "rustc.exe".into(),
            args: vec!["--version".into()],
            expected: "1.89.x",
            policy: VersionPolicy::Prefix(&[1, 89]),
        }),
        Ok(ToolCommand {
            id: "git",
            label: "Git",
            program: "git.exe".into(),
            args: vec!["--version".into()],
            expected: "Major 2",
            policy: VersionPolicy::Major(2),
        }),
    ];
    let handles = commands
        .into_iter()
        .map(|command| {
            let cwd = cwd.clone();
            thread::spawn(move || match command {
                Ok(command) => tool_check(command, cwd.as_deref()),
                Err(error) => check(
                    "pnpm",
                    "Toolchain",
                    "Corepack / pnpm",
                    Err(error),
                    "pnpm deve ser resolvido pelo Corepack ao lado do Node.js.",
                    Some("Major 9"),
                    Some("repair-toolchain"),
                ),
            })
        })
        .collect::<Vec<_>>();
    checks.extend(
        handles
            .into_iter()
            .map(|handle| handle.join().expect("doctor worker panicked")),
    );

    let shell = crate::terminal::preferred_shell();
    checks.push(check(
        "terminal",
        "Sistema",
        "Terminal / ConPTY",
        Path::new(&shell)
            .is_file()
            .then_some(shell)
            .ok_or_else(|| "Shell PowerShell absoluto não encontrado".into()),
        "Shell absoluto usado pelo backend ConPTY; nenhuma sessão é criada pelo Doctor.",
        Some("PowerShell local"),
        Some("repair-terminal"),
    ));
    checks.push(check(
        "workbench",
        "Coworking",
        "Matriz Workbench",
        workspace.as_ref().map_err(Clone::clone).and_then(|root| {
            let manifest = root.join("apps/matriz-workbench/package.json");
            manifest
                .is_file()
                .then(|| manifest.display().to_string())
                .ok_or_else(|| "Manifesto do Workbench não encontrado".into())
        }),
        "Autoridade de projetos, tarefas e execuções Codex.",
        Some("App registrado no workspace"),
        Some("repair-workbench"),
    ));
    checks.push(codex_check());
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
    use super::{
        corepack_pnpm_command, fixed_output, matches_major_version, resolve_codex_runtime,
    };

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

    #[test]
    fn toolchain_policy_matches_only_the_requested_major() {
        assert!(matches_major_version("v22.13.1", 22));
        assert!(matches_major_version("rustc 1.89.0 (abc)", 1));
        assert!(!matches_major_version("v21.9.0", 22));
        assert!(!matches_major_version("unavailable", 22));
    }

    #[test]
    fn codex_resolution_prefers_the_plugin_then_desktop_runtime() {
        let directory = tempfile::tempdir().expect("codex fixture");
        let plugin = directory.path().join("plugin-codex.exe");
        let desktop = directory.path().join("desktop-codex.exe");
        std::fs::write(&desktop, b"desktop").expect("desktop fixture");

        assert_eq!(
            resolve_codex_runtime(Some(&plugin), Some(&desktop))
                .expect("desktop runtime")
                .0,
            "desktop"
        );
        std::fs::write(&plugin, b"plugin").expect("plugin fixture");
        assert_eq!(
            resolve_codex_runtime(Some(&plugin), Some(&desktop))
                .expect("plugin runtime")
                .0,
            "plugin"
        );
    }
}
