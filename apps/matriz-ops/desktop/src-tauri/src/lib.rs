mod runtime;

use std::time::Duration;
use tauri::Url;

pub use runtime::{probe_health_endpoint, ConnectionError, RuntimeTargets, RuntimeValidationError};

fn current_targets() -> Result<RuntimeTargets, RuntimeValidationError> {
    if cfg!(debug_assertions) {
        Ok(RuntimeTargets::development())
    } else {
        RuntimeTargets::release(
            option_env!("MATRIZ_OPS_DESKTOP_URL").unwrap_or(""),
            option_env!("MATRIZ_IDENTITY_ISSUER").unwrap_or(""),
        )
    }
}

#[tauri::command]
async fn connect_ops(window: tauri::WebviewWindow) -> Result<(), &'static str> {
    let targets = current_targets().map_err(|_| "OPS_DESKTOP_CONFIGURATION_INVALID")?;
    probe_health_endpoint(&targets.health_url(), Duration::from_secs(5))
        .await
        .map_err(|_| "OPS_UNAVAILABLE")?;
    let target: Url = targets
        .ops_origin()
        .parse()
        .map_err(|_| "OPS_DESKTOP_CONFIGURATION_INVALID")?;
    window.navigate(target).map_err(|_| "OPS_NAVIGATION_FAILED")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let navigation_targets = current_targets().unwrap_or_else(|_| RuntimeTargets::launcher_only());
    tauri::Builder::default()
        .plugin(
            tauri::plugin::Builder::<tauri::Wry>::new("ops-navigation")
                .on_navigation(move |_webview, url| {
                    navigation_targets.allows_navigation(url.as_str())
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![connect_ops])
        .run(tauri::generate_context!())
        .expect("failed to run Matriz Ops desktop")
}
