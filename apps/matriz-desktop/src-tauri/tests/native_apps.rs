use matriz_desktop_native::{classify_native_app, native_executable_name, NativeAppState};

#[test]
fn native_state_follows_build_install_and_process_precedence() {
    assert_eq!(
        classify_native_app(false, false, false),
        NativeAppState::NotBuilt
    );
    assert_eq!(
        classify_native_app(true, false, false),
        NativeAppState::Built
    );
    assert_eq!(
        classify_native_app(true, true, false),
        NativeAppState::Installed
    );
    assert_eq!(
        classify_native_app(true, true, true),
        NativeAppState::Running
    );
}

#[test]
fn running_never_masks_a_missing_install() {
    assert_eq!(
        classify_native_app(true, false, true),
        NativeAppState::Built
    );
}

#[test]
fn installed_executable_matches_the_tauri_binary() {
    assert_eq!(native_executable_name(), "seumei-desktop.exe");
}
