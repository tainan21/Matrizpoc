use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use uuid::Uuid;

const VERSION: u8 = 1;

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum HubArea {
    Ports,
    Apps,
    Workspace,
    Terminal,
    Actions,
    Doctor,
    Settings,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionContext {
    pub area: HubArea,
    pub app_id: Option<String>,
    pub terminal_cwd: Option<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResumeSession {
    pub area: HubArea,
    pub app_id: Option<String>,
    pub terminal_cwd: Option<String>,
    pub updated_at: u128,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HubStateSnapshot {
    pub workspace_path: String,
    pub resume: Option<ResumeSession>,
    pub last_used_at: BTreeMap<String, u128>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Document {
    version: u8,
    workspace_path: String,
    resume: Option<ResumeSession>,
    #[serde(default)]
    last_used_at: BTreeMap<String, u128>,
}

#[derive(Clone)]
pub struct HubStateStore {
    path: PathBuf,
    lock: Arc<Mutex<()>>,
}

impl HubStateStore {
    pub fn at(path: PathBuf) -> Self {
        Self {
            path,
            lock: Arc::new(Mutex::new(())),
        }
    }

    pub fn read(&self, workspace: impl AsRef<Path>) -> Result<HubStateSnapshot, String> {
        let _guard = self.lock.lock().map_err(|_| "Hub state lock poisoned")?;
        let workspace = workspace_key(workspace.as_ref());
        let document = self
            .read_unlocked()
            .filter(|item| item.workspace_path.eq_ignore_ascii_case(&workspace));
        Ok(document.map(snapshot_from).unwrap_or(HubStateSnapshot {
            workspace_path: workspace,
            ..HubStateSnapshot::default()
        }))
    }

    pub fn record(
        &self,
        workspace: impl AsRef<Path>,
        context: SessionContext,
    ) -> Result<(), String> {
        let _guard = self.lock.lock().map_err(|_| "Hub state lock poisoned")?;
        let workspace = workspace_key(workspace.as_ref());
        let mut document = self.for_workspace(&workspace);
        let timestamp = now();
        if let Some(app_id) = context.app_id.as_deref() {
            document.last_used_at.insert(app_id.to_owned(), timestamp);
        }
        document.resume = Some(ResumeSession {
            area: context.area,
            app_id: context.app_id,
            terminal_cwd: context.terminal_cwd,
            updated_at: timestamp,
        });
        self.write_unlocked(&document)
    }

    pub fn mark_used(&self, workspace: impl AsRef<Path>, app_id: &str) -> Result<(), String> {
        self.set_last_used(workspace.as_ref(), app_id, now())
    }

    pub fn last_used(
        &self,
        workspace: impl AsRef<Path>,
        app_id: &str,
    ) -> Result<Option<u128>, String> {
        Ok(self.read(workspace)?.last_used_at.get(app_id).copied())
    }

    #[doc(hidden)]
    pub fn set_last_used_for_test(
        &self,
        workspace: impl AsRef<Path>,
        app_id: &str,
        timestamp: u128,
    ) -> Result<(), String> {
        self.set_last_used(workspace.as_ref(), app_id, timestamp)
    }

    fn set_last_used(&self, workspace: &Path, app_id: &str, timestamp: u128) -> Result<(), String> {
        let _guard = self.lock.lock().map_err(|_| "Hub state lock poisoned")?;
        let workspace = workspace_key(workspace);
        let mut document = self.for_workspace(&workspace);
        document.last_used_at.insert(app_id.to_owned(), timestamp);
        self.write_unlocked(&document)
    }

    fn for_workspace(&self, workspace: &str) -> Document {
        self.read_unlocked()
            .filter(|item| item.workspace_path.eq_ignore_ascii_case(workspace))
            .unwrap_or(Document {
                version: VERSION,
                workspace_path: workspace.to_owned(),
                resume: None,
                last_used_at: BTreeMap::new(),
            })
    }

    fn read_unlocked(&self) -> Option<Document> {
        let bytes = fs::read(&self.path).ok()?;
        let document: Document = serde_json::from_slice(&bytes).ok()?;
        (document.version == VERSION).then_some(document)
    }

    fn write_unlocked(&self, document: &Document) -> Result<(), String> {
        let parent = self.path.parent().ok_or("Hub state path has no parent")?;
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        let temporary = parent.join(format!("hub-state-{}.tmp", Uuid::new_v4()));
        fs::write(
            &temporary,
            serde_json::to_vec_pretty(document).map_err(|error| error.to_string())?,
        )
        .map_err(|error| error.to_string())?;
        replace_file(&temporary, &self.path)
    }
}

fn snapshot_from(document: Document) -> HubStateSnapshot {
    HubStateSnapshot {
        workspace_path: document.workspace_path,
        resume: document.resume,
        last_used_at: document.last_used_at,
    }
}
fn workspace_key(path: &Path) -> String {
    path.canonicalize()
        .unwrap_or_else(|_| path.to_path_buf())
        .display()
        .to_string()
}
fn now() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

#[cfg(windows)]
fn replace_file(source: &Path, destination: &Path) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
    };
    let source: Vec<u16> = source.as_os_str().encode_wide().chain(Some(0)).collect();
    let destination: Vec<u16> = destination
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect();
    if unsafe {
        MoveFileExW(
            source.as_ptr(),
            destination.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    } == 0
    {
        return Err(std::io::Error::last_os_error().to_string());
    }
    Ok(())
}

#[cfg(not(windows))]
fn replace_file(source: &Path, destination: &Path) -> Result<(), String> {
    fs::rename(source, destination).map_err(|error| error.to_string())
}
