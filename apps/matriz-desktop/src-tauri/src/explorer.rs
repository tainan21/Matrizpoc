use std::{fs, path::Path, process::Command, time::UNIX_EPOCH};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::Serialize;

use crate::resources::WorkspaceResourceService;

const MAX_TEXT_BYTES: u64 = 256 * 1024;
const MAX_IMAGE_BYTES: u64 = 8 * 1024 * 1024;
const IGNORED_DIRECTORIES: &[&str] = &[".git", ".next", ".turbo", "node_modules", "target"];

#[derive(Clone, Debug)]
pub struct ExplorerService {
    resources: WorkspaceResourceService,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerEntry {
    pub name: String,
    pub relative_path: String,
    pub is_directory: bool,
    pub size: u64,
    pub modified_at: u64,
    pub extension: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryListing {
    pub app_id: String,
    pub relative_path: String,
    pub entries: Vec<ExplorerEntry>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", content = "value", rename_all = "camelCase")]
pub enum PreviewContent {
    Text(String),
    Image(String),
    Unsupported,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FilePreview {
    pub app_id: String,
    pub relative_path: String,
    pub name: String,
    pub size: u64,
    pub content: PreviewContent,
}

impl ExplorerService {
    pub fn new(root: std::path::PathBuf) -> Result<Self, String> {
        Ok(Self {
            resources: WorkspaceResourceService::new(root)?,
        })
    }

    pub fn list(&self, app_id: &str, relative_path: &str) -> Result<DirectoryListing, String> {
        let directory = if relative_path.is_empty() {
            self.resources.app_root(app_id)?
        } else {
            self.resources.existing_path(app_id, relative_path)?
        };
        if !directory.is_dir() {
            return Err("Explorer target is not a directory".into());
        }
        let mut entries = fs::read_dir(directory)
            .map_err(|error| format!("Could not read directory: {error}"))?
            .filter_map(Result::ok)
            .filter(|entry| {
                !IGNORED_DIRECTORIES.contains(&entry.file_name().to_string_lossy().as_ref())
            })
            .filter_map(|entry| self.describe(app_id, entry.path()).ok())
            .collect::<Vec<_>>();
        entries.sort_by_key(|entry| (!entry.is_directory, entry.name.to_lowercase()));
        Ok(DirectoryListing {
            app_id: app_id.into(),
            relative_path: normalize(relative_path),
            entries,
        })
    }

    pub fn preview(&self, app_id: &str, relative_path: &str) -> Result<FilePreview, String> {
        let path = self.resources.existing_path(app_id, relative_path)?;
        if !path.is_file() {
            return Err("Explorer target is not a file".into());
        }
        let metadata = path
            .metadata()
            .map_err(|error| format!("Could not read file metadata: {error}"))?;
        let name = path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_string();
        let extension = extension(&path);
        let content = if let Some(mime) = image_mime(&extension) {
            if metadata.len() > MAX_IMAGE_BYTES {
                return Err("Image is too large to preview".into());
            }
            let bytes =
                fs::read(&path).map_err(|error| format!("Could not read image: {error}"))?;
            PreviewContent::Image(format!("data:{mime};base64,{}", STANDARD.encode(bytes)))
        } else if is_text(&extension) {
            if metadata.len() > MAX_TEXT_BYTES {
                return Err("Text file is too large to preview".into());
            }
            PreviewContent::Text(
                fs::read_to_string(&path).map_err(|_| "Text preview requires UTF-8".to_string())?,
            )
        } else {
            PreviewContent::Unsupported
        };
        Ok(FilePreview {
            app_id: app_id.into(),
            relative_path: normalize(relative_path),
            name,
            size: metadata.len(),
            content,
        })
    }

    pub fn rename(&self, app_id: &str, relative_path: &str, new_name: &str) -> Result<(), String> {
        guard_mutation(relative_path)?;
        let source = self.resources.existing_path(app_id, relative_path)?;
        let parent = Path::new(relative_path)
            .parent()
            .and_then(Path::to_str)
            .unwrap_or("");
        let target = self.resources.new_child_path(app_id, parent, new_name)?;
        if target.exists() {
            return Err("A resource with this name already exists".into());
        }
        fs::rename(source, target).map_err(|error| format!("Could not rename resource: {error}"))
    }

    pub fn duplicate(
        &self,
        app_id: &str,
        relative_path: &str,
        new_name: &str,
    ) -> Result<(), String> {
        guard_mutation(relative_path)?;
        let source = self.resources.existing_path(app_id, relative_path)?;
        if !source.is_file() {
            return Err("Only files can be duplicated".into());
        }
        let parent = Path::new(relative_path)
            .parent()
            .and_then(Path::to_str)
            .unwrap_or("");
        let target = self.resources.new_child_path(app_id, parent, new_name)?;
        fs::copy(source, target)
            .map(|_| ())
            .map_err(|error| format!("Could not duplicate file: {error}"))
    }

    pub fn recycle(&self, app_id: &str, relative_path: &str) -> Result<(), String> {
        guard_mutation(relative_path)?;
        let path = self.resources.existing_path(app_id, relative_path)?;
        trash::delete(path)
            .map_err(|error| format!("Could not move resource to Recycle Bin: {error}"))
    }

    pub fn open(&self, app_id: &str, relative_path: &str) -> Result<(), String> {
        let path = self.resolve(app_id, relative_path)?;
        Command::new("explorer.exe")
            .arg(path)
            .spawn()
            .map(|_| ())
            .map_err(|error| format!("Could not open resource: {error}"))
    }

    pub fn reveal(&self, app_id: &str, relative_path: &str) -> Result<(), String> {
        let path = self.resolve(app_id, relative_path)?;
        let argument = format!("/select,{}", path.display());
        Command::new("explorer.exe")
            .arg(argument)
            .spawn()
            .map(|_| ())
            .map_err(|error| format!("Could not reveal resource: {error}"))
    }

    pub fn open_in_editor(&self, app_id: &str, relative_path: &str) -> Result<(), String> {
        let path = self.resolve(app_id, relative_path)?;
        Command::new("code.cmd")
            .arg("--reuse-window")
            .arg(path)
            .spawn()
            .map(|_| ())
            .map_err(|error| format!("VS Code is unavailable: {error}"))
    }

    fn resolve(&self, app_id: &str, relative_path: &str) -> Result<std::path::PathBuf, String> {
        if relative_path.is_empty() {
            self.resources.app_root(app_id)
        } else {
            self.resources.existing_path(app_id, relative_path)
        }
    }

    fn describe(&self, app_id: &str, path: std::path::PathBuf) -> Result<ExplorerEntry, String> {
        let root = self.resources.app_root(app_id)?;
        let metadata = path.metadata().map_err(|error| error.to_string())?;
        let relative_path = path
            .strip_prefix(root)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .replace('\\', "/");
        Ok(ExplorerEntry {
            name: path
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or_default()
                .into(),
            relative_path,
            is_directory: metadata.is_dir(),
            size: metadata.len(),
            modified_at: metadata
                .modified()
                .ok()
                .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
                .map(|value| value.as_millis() as u64)
                .unwrap_or_default(),
            extension: path
                .extension()
                .and_then(|value| value.to_str())
                .map(str::to_lowercase),
        })
    }
}

fn extension(path: &Path) -> String {
    path.extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_lowercase()
}
fn normalize(path: &str) -> String {
    path.replace('\\', "/")
}
fn image_mime(extension: &str) -> Option<&'static str> {
    match extension {
        "png" => Some("image/png"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        "webp" => Some("image/webp"),
        "gif" => Some("image/gif"),
        "svg" => Some("image/svg+xml"),
        _ => None,
    }
}
fn is_text(extension: &str) -> bool {
    matches!(
        extension,
        "ts" | "tsx"
            | "js"
            | "jsx"
            | "json"
            | "css"
            | "scss"
            | "html"
            | "md"
            | "txt"
            | "yml"
            | "yaml"
            | "toml"
            | "rs"
            | "env"
    )
}
fn guard_mutation(relative_path: &str) -> Result<(), String> {
    let name = Path::new(relative_path)
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    if relative_path.is_empty()
        || name.starts_with(".env")
        || matches!(
            name,
            "package.json" | "pnpm-workspace.yaml" | "pnpm-lock.yaml"
        )
    {
        return Err("This operational file is protected in Explorer".into());
    }
    Ok(())
}
