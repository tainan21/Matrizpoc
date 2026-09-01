use std::{fs, path::PathBuf};

use serde::{Deserialize, Serialize};

#[cfg(windows)]
use std::os::windows::ffi::OsStrExt;
#[cfg(windows)]
use windows_sys::Win32::Storage::FileSystem::{
    MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
};

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum DesktopTheme {
    Matriz,
    ReactorAcid,
    AuroraLiquid,
    IndustrialEmber,
}

impl Default for DesktopTheme {
    fn default() -> Self {
        Self::Matriz
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopSettings {
    #[serde(default)]
    pub theme: DesktopTheme,
    pub close_to_tray: bool,
    pub sounds_enabled: bool,
    pub volume: f64,
    pub start_with_windows: bool,
    #[serde(default)]
    pub terminal_dock_open: bool,
    #[serde(default = "default_terminal_dock_height")]
    pub terminal_dock_height: u16,
    #[serde(default)]
    pub workspace_path: Option<String>,
}

impl Default for DesktopSettings {
    fn default() -> Self {
        Self {
            theme: DesktopTheme::default(),
            close_to_tray: true,
            sounds_enabled: true,
            volume: 0.45,
            start_with_windows: false,
            terminal_dock_open: false,
            terminal_dock_height: default_terminal_dock_height(),
            workspace_path: None,
        }
    }
}

impl DesktopSettings {
    pub fn normalized(mut self) -> Self {
        self.volume = if self.volume.is_finite() {
            self.volume.clamp(0.0, 1.0)
        } else {
            Self::default().volume
        };
        self.terminal_dock_height = self.terminal_dock_height.clamp(180, 520);
        self
    }
}

const fn default_terminal_dock_height() -> u16 {
    280
}

#[derive(Deserialize, Serialize)]
struct SettingsDocument {
    version: u8,
    settings: DesktopSettings,
}

pub struct SettingsStore {
    path: PathBuf,
}

impl SettingsStore {
    pub fn at(path: PathBuf) -> Self {
        Self { path }
    }

    pub fn read(&self) -> Result<DesktopSettings, String> {
        if !self.path.exists() {
            return Ok(DesktopSettings::default());
        }
        let contents = fs::read_to_string(&self.path).map_err(|error| error.to_string())?;
        let document: SettingsDocument = match serde_json::from_str(&contents) {
            Ok(document) => document,
            Err(_) => return Ok(DesktopSettings::default()),
        };
        if document.version != 1 {
            return Ok(DesktopSettings::default());
        }
        Ok(document.settings.normalized())
    }

    pub fn write(&self, settings: &DesktopSettings) -> Result<(), String> {
        let settings = settings.clone().normalized();
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        let temporary = self.path.with_extension("json.tmp");
        let document = SettingsDocument {
            version: 1,
            settings,
        };
        let bytes = serde_json::to_vec_pretty(&document).map_err(|error| error.to_string())?;
        fs::write(&temporary, bytes).map_err(|error| error.to_string())?;
        replace_file(&temporary, &self.path)
    }
}

#[cfg(windows)]
fn replace_file(source: &std::path::Path, destination: &std::path::Path) -> Result<(), String> {
    let source: Vec<u16> = source.as_os_str().encode_wide().chain(Some(0)).collect();
    let destination: Vec<u16> = destination
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect();
    let result = unsafe {
        MoveFileExW(
            source.as_ptr(),
            destination.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    };
    if result == 0 {
        return Err(std::io::Error::last_os_error().to_string());
    }
    Ok(())
}

#[cfg(not(windows))]
fn replace_file(source: &std::path::Path, destination: &std::path::Path) -> Result<(), String> {
    fs::rename(source, destination).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::{DesktopSettings, DesktopTheme, SettingsDocument};

    #[test]
    fn legacy_settings_default_to_the_matriz_theme() {
        let document: SettingsDocument = serde_json::from_str(
            r#"{"version":1,"settings":{"closeToTray":true,"soundsEnabled":true,"volume":0.45,"startWithWindows":false}}"#,
        )
        .expect("legacy settings remain readable");

        assert_eq!(document.settings.theme, DesktopTheme::Matriz);
        assert!(!document.settings.terminal_dock_open);
        assert_eq!(document.settings.terminal_dock_height, 280);
    }

    #[test]
    fn default_settings_start_with_the_matriz_theme() {
        assert_eq!(DesktopSettings::default().theme, DesktopTheme::Matriz);
    }
}
