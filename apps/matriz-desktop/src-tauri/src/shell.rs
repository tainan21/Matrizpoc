use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Runtime, WebviewWindow,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::{AwakeManager, PreviewManager, TerminalManager};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum TrayAction {
    Show,
    Exit,
}

fn tray_action(id: &str) -> Option<TrayAction> {
    match id {
        "show" => Some(TrayAction::Show),
        "exit" => Some(TrayAction::Exit),
        _ => None,
    }
}

pub fn toggle_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        toggle(&window);
    }
}

pub fn show_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

pub fn exit_app(app: &AppHandle) {
    let _ = app.state::<PreviewManager>().close();
    app.state::<AwakeManager>().shutdown();
    app.state::<TerminalManager>().shutdown();
    app.exit(0);
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
    let show = MenuItem::with_id(app, "show", "Mostrar Matriz Control", true, None::<&str>)?;
    let exit = MenuItem::with_id(app, "exit", "Sair", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &exit])?;
    let mut builder = TrayIconBuilder::new().tooltip("Matriz Control");
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match tray_action(event.id().0.as_str()) {
            Some(TrayAction::Show) => show_window(app),
            Some(TrayAction::Exit) => exit_app(app),
            None => {}
        })
        .on_tray_icon_event(|tray, event| {
            if matches!(
                event,
                TrayIconEvent::Click {
                    button: MouseButton::Left,
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
    tauri_plugin_global_shortcut::Builder::new().build()
}

pub fn install_shortcut<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    app.global_shortcut()
        .on_shortcut("Ctrl+Shift+M", |app, _, event| {
            if event.state() == ShortcutState::Pressed {
                toggle_window(app);
            }
        })
        .map_err(shortcut_registration_error)
}

fn shortcut_registration_error(error: impl std::fmt::Display) -> String {
    format!("Ctrl+Shift+M indisponível: {error}. Use o ícone da bandeja para mostrar o Control.")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tray_menu_ids_resolve_only_fixed_product_actions() {
        assert_eq!(tray_action("show"), Some(TrayAction::Show));
        assert_eq!(tray_action("exit"), Some(TrayAction::Exit));
        assert_eq!(tray_action("arbitrary"), None);
    }

    #[test]
    fn shortcut_failure_explains_the_non_global_fallback() {
        assert_eq!(
            shortcut_registration_error("atalho em uso"),
            "Ctrl+Shift+M indisponível: atalho em uso. Use o ícone da bandeja para mostrar o Control."
        );
    }
}
