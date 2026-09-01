use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::Serialize;
use uuid::Uuid;

use crate::{catalog::apps, hub_state::HubStateStore};

pub const STALE_AFTER: Duration = Duration::from_secs(5 * 24 * 60 * 60);

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeSweepCandidate {
    pub app_id: String,
    pub project_name: String,
    pub path: String,
    pub last_used_at: u128,
    pub package_manager: Option<String>,
    pub size_bytes: u64,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeSweepScan {
    pub scan_id: String,
    pub candidates: Vec<NodeSweepCandidate>,
    pub potential_bytes: u64,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeSweepDeleteResult {
    pub app_id: String,
    pub deleted: bool,
    pub recovered_bytes: u64,
    pub error: Option<String>,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeSweepDeletion {
    pub results: Vec<NodeSweepDeleteResult>,
    pub recovered_bytes: u64,
}

#[derive(Clone)]
struct ScanRecord {
    workspace: PathBuf,
    candidates: HashMap<String, u64>,
}

#[derive(Clone, Default)]
pub struct NodeSweepService {
    scans: Arc<Mutex<HashMap<String, ScanRecord>>>,
}

impl NodeSweepService {
    pub fn scan(&self, workspace: &Path, state: &HubStateStore) -> Result<NodeSweepScan, String> {
        let workspace = workspace
            .canonicalize()
            .map_err(|error| format!("Invalid workspace: {error}"))?;
        let now = millis(SystemTime::now());
        let mut candidates = Vec::new();
        for app in apps() {
            let app_path = workspace.join(app.directory);
            let app_metadata = match fs::symlink_metadata(&app_path) {
                Ok(value) => value,
                Err(_) => continue,
            };
            if is_reparse_or_symlink(&app_metadata) || !app_metadata.is_dir() {
                continue;
            }
            let app_root = match app_path.canonicalize() {
                Ok(value) if value.starts_with(&workspace) && value != workspace => value,
                _ => continue,
            };
            let target = app_root.join("node_modules");
            let metadata = match fs::symlink_metadata(&target) {
                Ok(value) => value,
                Err(_) => continue,
            };
            if is_reparse_or_symlink(&metadata) || !metadata.is_dir() {
                continue;
            }
            let fallback = fs::metadata(&app_root)
                .and_then(|value| value.modified())
                .map(millis)
                .unwrap_or(now);
            let last_used_at = state.last_used(&workspace, app.id)?.unwrap_or(fallback);
            if !is_stale_at(now, last_used_at) {
                continue;
            }
            let size_bytes = directory_size(&target)?;
            candidates.push(NodeSweepCandidate {
                app_id: app.id.into(),
                project_name: app.label.into(),
                path: target.display().to_string(),
                last_used_at,
                package_manager: package_manager(&app_root),
                size_bytes,
            });
        }
        let scan_id = Uuid::new_v4().to_string();
        let potential_bytes = candidates.iter().map(|item| item.size_bytes).sum();
        let mut scans = self
            .scans
            .lock()
            .map_err(|_| "Node Sweep scan lock poisoned")?;
        scans.clear();
        scans.insert(
            scan_id.clone(),
            ScanRecord {
                workspace,
                candidates: candidates
                    .iter()
                    .map(|item| (item.app_id.clone(), item.size_bytes))
                    .collect(),
            },
        );
        Ok(NodeSweepScan {
            scan_id,
            candidates,
            potential_bytes,
        })
    }

    pub fn delete(
        &self,
        workspace: &Path,
        state: &HubStateStore,
        scan_id: &str,
        app_ids: &[String],
    ) -> Result<NodeSweepDeletion, String> {
        if app_ids.is_empty() {
            return Err("Select at least one cleanup candidate".into());
        }
        let workspace = workspace
            .canonicalize()
            .map_err(|error| format!("Invalid workspace: {error}"))?;
        let scan = self
            .scans
            .lock()
            .map_err(|_| "Node Sweep scan lock poisoned")?
            .remove(scan_id)
            .ok_or("Node Sweep preview is stale; scan again")?;
        if scan.workspace != workspace {
            return Err("Workspace changed; scan again".into());
        }
        let mut results = Vec::new();
        for app_id in app_ids {
            let result = delete_one(&workspace, state, &scan, app_id);
            results.push(match result {
                Ok(bytes) => NodeSweepDeleteResult {
                    app_id: app_id.clone(),
                    deleted: true,
                    recovered_bytes: bytes,
                    error: None,
                },
                Err(error) => NodeSweepDeleteResult {
                    app_id: app_id.clone(),
                    deleted: false,
                    recovered_bytes: 0,
                    error: Some(error),
                },
            });
        }
        let recovered_bytes = results.iter().map(|item| item.recovered_bytes).sum();
        Ok(NodeSweepDeletion {
            results,
            recovered_bytes,
        })
    }
}

fn delete_one(
    workspace: &Path,
    state: &HubStateStore,
    scan: &ScanRecord,
    app_id: &str,
) -> Result<u64, String> {
    let expected_size = *scan
        .candidates
        .get(app_id)
        .ok_or("Project was not a cleanup candidate")?;
    let app = crate::catalog::app_definition(app_id)?;
    let app_path = workspace.join(app.directory);
    let app_metadata = fs::symlink_metadata(&app_path)
        .map_err(|error| format!("Project is unavailable: {error}"))?;
    if is_reparse_or_symlink(&app_metadata) {
        return Err("Project root is a link or reparse point".into());
    }
    let app_root = app_path
        .canonicalize()
        .map_err(|error| format!("Project is unavailable: {error}"))?;
    if !app_root.starts_with(workspace) || app_root == workspace {
        return Err("Project escapes the registered workspace".into());
    }
    let target = app_root.join("node_modules");
    if target.file_name().and_then(|name| name.to_str()) != Some("node_modules") {
        return Err("Cleanup target is not node_modules".into());
    }
    let metadata = fs::symlink_metadata(&target)
        .map_err(|error| format!("node_modules is unavailable: {error}"))?;
    if is_reparse_or_symlink(&metadata) {
        return Err("node_modules is a link or reparse point".into());
    }
    let canonical = target
        .canonicalize()
        .map_err(|error| format!("node_modules is unavailable: {error}"))?;
    if !canonical.starts_with(&app_root) || canonical == app_root || canonical == workspace {
        return Err("Cleanup target escapes the registered project".into());
    }
    let now = millis(SystemTime::now());
    let fallback = fs::metadata(&app_root)
        .and_then(|value| value.modified())
        .map(millis)
        .unwrap_or(now);
    let last_used = state.last_used(workspace, app_id)?.unwrap_or(fallback);
    if !is_stale_at(now, last_used) {
        return Err("Project was used within the last five days".into());
    }
    remove_tree_without_following_links(&canonical)?;
    Ok(expected_size)
}

fn directory_size(path: &Path) -> Result<u64, String> {
    let mut total = 0;
    for entry in fs::read_dir(path).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let metadata = fs::symlink_metadata(entry.path()).map_err(|error| error.to_string())?;
        if is_reparse_or_symlink(&metadata) {
            continue;
        }
        if metadata.is_dir() {
            total += directory_size(&entry.path())?;
        } else {
            total += metadata.len();
        }
    }
    Ok(total)
}

fn remove_tree_without_following_links(path: &Path) -> Result<(), String> {
    for entry in fs::read_dir(path).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let child = entry.path();
        let metadata = fs::symlink_metadata(&child).map_err(|error| error.to_string())?;
        if is_reparse_or_symlink(&metadata) {
            remove_link(&child, &metadata)?;
        } else if metadata.is_dir() {
            remove_tree_without_following_links(&child)?;
        } else {
            fs::remove_file(&child).map_err(|error| error.to_string())?;
        }
    }
    fs::remove_dir(path).map_err(|error| error.to_string())
}

fn package_manager(app_root: &Path) -> Option<String> {
    fs::read_to_string(app_root.join("package.json"))
        .ok()
        .and_then(|contents| serde_json::from_str::<serde_json::Value>(&contents).ok())
        .and_then(|value| {
            value
                .get("packageManager")
                .and_then(|item| item.as_str())
                .and_then(|item| item.split('@').next())
                .map(str::to_owned)
        })
        .or_else(|| {
            app_root
                .join("pnpm-lock.yaml")
                .exists()
                .then(|| "pnpm".into())
        })
        .or_else(|| app_root.join("yarn.lock").exists().then(|| "yarn".into()))
        .or_else(|| {
            app_root
                .join("package-lock.json")
                .exists()
                .then(|| "npm".into())
        })
}
fn millis(value: SystemTime) -> u128 {
    value
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}
#[doc(hidden)]
pub fn is_stale_at(now: u128, last_used_at: u128) -> bool {
    now.saturating_sub(last_used_at) >= STALE_AFTER.as_millis()
}

#[cfg(windows)]
fn remove_link(path: &Path, metadata: &fs::Metadata) -> Result<(), String> {
    use std::os::windows::fs::MetadataExt;
    let result = if metadata.file_attributes() & 0x10 != 0 {
        fs::remove_dir(path)
    } else {
        fs::remove_file(path)
    };
    result.map_err(|error| error.to_string())
}
#[cfg(not(windows))]
fn remove_link(path: &Path, _metadata: &fs::Metadata) -> Result<(), String> {
    fs::remove_file(path).map_err(|error| error.to_string())
}

#[cfg(windows)]
fn is_reparse_or_symlink(metadata: &fs::Metadata) -> bool {
    use std::os::windows::fs::MetadataExt;
    metadata.file_type().is_symlink() || metadata.file_attributes() & 0x400 != 0
}
#[cfg(not(windows))]
fn is_reparse_or_symlink(metadata: &fs::Metadata) -> bool {
    metadata.file_type().is_symlink()
}
