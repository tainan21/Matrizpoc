use std::fs;

use matriz_desktop_native::{DesktopSettings, SettingsStore};

#[test]
fn settings_defaults_and_volume_are_normalized() {
    assert_eq!(DesktopSettings::default().volume, 0.45);
    assert_eq!(
        DesktopSettings {
            volume: 4.0,
            ..DesktopSettings::default()
        }
        .normalized()
        .volume,
        1.0
    );
}

#[test]
fn corrupt_settings_fall_back_without_destroying_the_file() {
    let directory = tempfile::tempdir().expect("settings fixture");
    let path = directory.path().join("settings.json");
    fs::write(&path, "not json").expect("corrupt settings");
    let store = SettingsStore::at(path.clone());

    assert_eq!(
        store.read().expect("fallback settings"),
        DesktopSettings::default()
    );
    assert_eq!(fs::read_to_string(path).expect("original file"), "not json");
}

#[test]
fn settings_write_is_readable_as_a_complete_document() {
    let directory = tempfile::tempdir().expect("settings fixture");
    let store = SettingsStore::at(directory.path().join("settings.json"));
    let desired = DesktopSettings {
        close_to_tray: false,
        sounds_enabled: false,
        volume: 0.7,
        start_with_windows: true,
    };
    store.write(&desired).expect("atomic settings write");
    assert_eq!(store.read().expect("stored settings"), desired);
}
