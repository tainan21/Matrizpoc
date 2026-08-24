use serde::Serialize;

use crate::{catalog, terminal::TerminalSession, ObservedProcess};

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeInstance {
    pub id: &'static str,
    pub label: &'static str,
    pub port: u16,
    pub status: &'static str,
    pub ownership: &'static str,
    pub pid: Option<u32>,
    pub session_id: Option<String>,
    pub endpoint: String,
    pub health: &'static str,
}

pub fn snapshot(
    listeners: &[ObservedProcess],
    sessions: &[TerminalSession],
) -> Vec<RuntimeInstance> {
    catalog::apps()
        .iter()
        .map(|app| {
            let listener = listeners.iter().find(|listener| listener.port == app.port);
            let operation_id = format!("app.{}.web", app.id);
            let session = sessions
                .iter()
                .filter(|session| session.operation_id.as_deref() == Some(&operation_id))
                .max_by_key(|session| matches!(session.status, "running" | "starting"));
            let active = session.filter(|session| matches!(session.status, "running" | "starting"));
            let failed = session.filter(|session| matches!(session.status, "failed" | "exited"));

            let (status, ownership, health) = match (listener, active, failed) {
                (Some(_), Some(_), _) => ("ready", "managed", "healthy"),
                (Some(_), None, _) => ("ready", "external", "healthy"),
                (None, Some(_), _) => ("starting", "managed", "pending"),
                (None, None, Some(_)) => ("degraded", "managed", "unhealthy"),
                (None, None, None) => ("stopped", "none", "offline"),
            };

            RuntimeInstance {
                id: app.id,
                label: app.label,
                port: app.port,
                status,
                ownership,
                pid: listener.map(|listener| listener.pid),
                session_id: session.map(|session| session.id.clone()),
                endpoint: format!("http://localhost:{}/", app.port),
                health,
            }
        })
        .collect()
}

pub fn runtime_url(app_id: &str, route_path: &str) -> Result<String, String> {
    let app = catalog::app_definition(app_id)?;
    validate_route_path(route_path)?;
    Ok(format!("http://localhost:{}{}", app.port, route_path))
}

pub fn ensure_preview_ready(app_id: &str, listeners: &[ObservedProcess]) -> Result<(), String> {
    let app = catalog::app_definition(app_id)?;
    if listeners.iter().any(|listener| listener.port == app.port) {
        Ok(())
    } else {
        Err(format!(
            "{} is not listening on port {}; start it before opening Preview",
            app.label, app.port
        ))
    }
}

pub fn validate_route_path(route_path: &str) -> Result<(), String> {
    if route_path.is_empty() || route_path.len() > 2048 || !route_path.starts_with('/') {
        return Err("Route must be an absolute local path of at most 2048 bytes".into());
    }
    let lower = route_path.to_ascii_lowercase();
    if route_path.starts_with("//")
        || route_path.contains("\\")
        || route_path.contains("://")
        || route_path.chars().any(char::is_control)
        || lower.contains("%2e")
        || lower.contains("%5c")
    {
        return Err("Route contains an unsafe path sequence".into());
    }
    let path = route_path.split(['?', '#']).next().unwrap_or(route_path);
    if path.split('/').any(|segment| segment == "..") {
        return Err("Route cannot traverse parent paths".into());
    }
    Ok(())
}

pub fn preview_navigation_allowed(app_id: &str, candidate: &str) -> bool {
    let Ok(app) = catalog::app_definition(app_id) else {
        return false;
    };
    let Ok(url) = candidate.parse::<tauri::Url>() else {
        return false;
    };
    url.scheme() == "http"
        && url.host_str() == Some("localhost")
        && url.port_or_known_default() == Some(app.port)
        && url.username().is_empty()
        && url.password().is_none()
}
