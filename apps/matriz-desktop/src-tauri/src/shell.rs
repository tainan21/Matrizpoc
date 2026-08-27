use tauri::{
    tray::{MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Runtime, WebviewWindow,
};
use tauri_plugin_global_shortcut::ShortcutState;

pub fn toggle_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        toggle(&window);
    }
}

fn toggle<R: Runtime>(window: &WebviewWindow<R>) {
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

pub fn install_tray(app: &AppHandle) -> tauri::Result<()> {
    let mut builder = TrayIconBuilder::new().tooltip("Matriz Control");
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if matches!(
                event,
                TrayIconEvent::Click {
                    button_state: MouseButtonState::Up,
                    ..
                }
            ) {
                toggle_window(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

pub fn shortcut_plugin<R: Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri_plugin_global_shortcut::Builder::new()
        .with_shortcut("Ctrl+Shift+M")
        .expect("valid Matriz Control shortcut")
        .with_handler(|app, _, event| {
            if event.state() == ShortcutState::Pressed {
                toggle_window(app);
            }
        })
        .build()
}
