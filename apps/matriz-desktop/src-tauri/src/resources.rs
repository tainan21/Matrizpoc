use std::path::{Component, Path, PathBuf};

use crate::catalog::app_definition;

#[derive(Clone, Debug)]
pub struct WorkspaceResourceService {
    root: PathBuf,
}

impl WorkspaceResourceService {
    pub fn new(root: PathBuf) -> Result<Self, String> {
        let root = root
            .canonicalize()
            .map_err(|error| format!("Invalid workspace root: {error}"))?;
        Ok(Self { root })
    }

    pub fn app_root(&self, app_id: &str) -> Result<PathBuf, String> {
        let definition = app_definition(app_id)?;
        let path = self.root.join(definition.directory);
        let canonical = path
            .canonicalize()
            .map_err(|error| format!("App directory is unavailable: {error}"))?;
        if !canonical.starts_with(&self.root) {
            return Err("App directory escapes the selected workspace".into());
        }
        Ok(canonical)
    }

    pub fn existing_path(&self, app_id: &str, relative_path: &str) -> Result<PathBuf, String> {
        validate_relative(relative_path)?;
        let root = self.app_root(app_id)?;
        let canonical = root
            .join(relative_path)
            .canonicalize()
            .map_err(|error| format!("Resource is unavailable: {error}"))?;
        if !canonical.starts_with(&root) {
            return Err("Resource escapes the selected app".into());
        }
        Ok(canonical)
    }

    pub fn new_child_path(
        &self,
        app_id: &str,
        parent: &str,
        name: &str,
    ) -> Result<PathBuf, String> {
        validate_file_name(name)?;
        let parent = self.existing_path(app_id, parent)?;
        if !parent.is_dir() {
            return Err("Resource parent is not a directory".into());
        }
        Ok(parent.join(name))
    }
}

fn validate_relative(value: &str) -> Result<(), String> {
    let path = Path::new(value);
    if path.is_absolute()
        || path
            .components()
            .any(|component| !matches!(component, Component::Normal(_) | Component::CurDir))
    {
        return Err("Resource path must be relative to the selected app".into());
    }
    Ok(())
}

fn validate_file_name(value: &str) -> Result<(), String> {
    let mut components = Path::new(value).components();
    let upper_stem = value
        .split('.')
        .next()
        .unwrap_or_default()
        .to_ascii_uppercase();
    let reserved = matches!(upper_stem.as_str(), "CON" | "PRN" | "AUX" | "NUL")
        || (upper_stem.len() == 4
            && (upper_stem.starts_with("COM") || upper_stem.starts_with("LPT"))
            && upper_stem.as_bytes()[3].is_ascii_digit()
            && upper_stem.as_bytes()[3] != b'0');
    if value.is_empty()
        || !matches!(components.next(), Some(Component::Normal(_)))
        || components.next().is_some()
        || value.ends_with(['.', ' '])
        || value
            .chars()
            .any(|character| character.is_control() || r#"<>:"/\|?*"#.contains(character))
        || reserved
    {
        return Err("Resource name must be a safe single filename".into());
    }
    Ok(())
}
