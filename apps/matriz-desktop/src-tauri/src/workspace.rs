use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
};

use serde::Serialize;

use crate::catalog::{app_definition, apps, quick_target, QuickTarget};
use crate::ports::enumerate_listeners;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Clone, Default)]
pub struct OperationsState {
    root: Arc<Mutex<Option<PathBuf>>>,
    children: Arc<Mutex<HashMap<String, Child>>>,
    active_gate: Arc<Mutex<Option<String>>>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppRuntime {
    pub id: &'static str,
    pub port: u16,
    pub status: &'static str,
    pub pid: Option<u32>,
}

impl OperationsState {
    pub fn discover() -> Self {
        let state = Self::default();
        let discovered = std::env::current_dir().ok().and_then(|path| {
            path.ancestors()
                .find_map(|path| validate_workspace(path).ok())
        });
        *state.root.lock().expect("workspace lock") = discovered;
        state
    }

    pub fn select_workspace(&self, path: &Path) -> Result<PathBuf, String> {
        let canonical = validate_workspace(path)?;
        *self.root.lock().map_err(|_| "Workspace lock poisoned")? = Some(canonical.clone());
        Ok(canonical)
    }

    pub fn restore_workspace(&self, path: Option<&str>) -> bool {
        path.and_then(|path| self.select_workspace(Path::new(path)).ok())
            .is_some()
    }

    pub fn root(&self) -> Result<PathBuf, String> {
        self.root
            .lock()
            .map_err(|_| "Workspace lock poisoned")?
            .clone()
            .ok_or_else(|| "Matriz workspace has not been selected".into())
    }

    pub fn start_app_with_environment(
        &self,
        app_id: &str,
        environment: &[(String, String)],
    ) -> Result<(), String> {
        let app = app_definition(app_id)?;
        let root = self.root()?;
        let mut children = self.children.lock().map_err(|_| "App lock poisoned")?;
        if let Some(child) = children.get_mut(app_id) {
            if child
                .try_wait()
                .map_err(|error| error.to_string())?
                .is_none()
            {
                return Ok(());
            }
        }

        let mut command = Command::new("pnpm.cmd");
        command
            .current_dir(root)
            .args(["--filter", app.package_name, "dev"])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        for (key, value) in environment {
            command.env(key, value);
        }
        #[cfg(windows)]
        command.creation_flags(CREATE_NO_WINDOW);
        let child = command
            .spawn()
            .map_err(|error| format!("Unable to start {}: {error}", app.id))?;
        children.insert(app.id.to_owned(), child);
        Ok(())
    }

    pub fn stop_app(&self, app_id: &str) -> Result<(), String> {
        app_definition(app_id)?;
        let child = self
            .children
            .lock()
            .map_err(|_| "App lock poisoned")?
            .remove(app_id);
        if let Some(mut child) = child {
            child
                .kill()
                .map_err(|error| format!("Unable to stop {app_id}: {error}"))?;
            let _ = child.wait();
        } else {
            return Err(format!(
                "{app_id} was not started by Matriz Control and cannot be stopped here"
            ));
        }
        Ok(())
    }

    pub fn app_statuses(&self) -> Result<Vec<AppRuntime>, String> {
        let listeners = enumerate_listeners()?;
        Ok(apps()
            .iter()
            .map(|app| {
                let listener = listeners.iter().find(|listener| listener.port == app.port);
                AppRuntime {
                    id: app.id,
                    port: app.port,
                    status: if listener.is_some() {
                        "ready"
                    } else {
                        "stopped"
                    },
                    pid: listener.map(|item| item.pid),
                }
            })
            .collect())
    }

    pub fn open_target(&self, target_id: &str) -> Result<(), String> {
        let target = quick_target(target_id)?;
        let mut command = match target {
            QuickTarget::Workspace => {
                let mut command = Command::new("explorer.exe");
                command.arg(self.root()?);
                command
            }
            QuickTarget::Terminal => {
                let mut command = Command::new("wt.exe");
                command.args(["-d"]).arg(self.root()?);
                command
            }
            QuickTarget::Url(url) => {
                let mut command = Command::new("explorer.exe");
                command.arg(url);
                command
            }
        };
        #[cfg(windows)]
        command.creation_flags(CREATE_NO_WINDOW);
        command
            .spawn()
            .map_err(|error| format!("Unable to open {target_id}: {error}"))?;
        Ok(())
    }

    pub(crate) fn gate_slot(&self) -> &Arc<Mutex<Option<String>>> {
        &self.active_gate
    }
}

pub fn validate_workspace(path: &Path) -> Result<PathBuf, String> {
    let canonical = path
        .canonicalize()
        .map_err(|error| format!("Invalid workspace path: {error}"))?;
    if !canonical.join("package.json").is_file() || !canonical.join("pnpm-workspace.yaml").is_file()
    {
        return Err("Selected folder is not a Matriz pnpm workspace".into());
    }
    Ok(canonical)
}

#[cfg(test)]
mod tests {
    use super::OperationsState;
    use std::fs;

    #[test]
    fn restores_only_a_valid_saved_workspace() {
        let directory = tempfile::tempdir().expect("workspace fixture");
        fs::write(directory.path().join("package.json"), "{}").expect("package marker");
        fs::write(directory.path().join("pnpm-workspace.yaml"), "packages: []")
            .expect("workspace marker");
        let state = OperationsState::default();

        assert!(!state.restore_workspace(Some("missing-workspace")));
        assert!(state.root().is_err());
        assert!(state.restore_workspace(directory.path().to_str()));
        assert_eq!(
            state.root().expect("restored root"),
            directory.path().canonicalize().expect("canonical fixture")
        );
    }

    #[test]
    fn refuses_to_stop_a_process_it_does_not_own() {
        let state = OperationsState::default();

        let error = state.stop_app("contracts").expect_err("unowned process");

        assert!(error.contains("was not started by Matriz Control"));
    }
}
