use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{LogicalPosition, LogicalSize, Manager, Webview, WebviewBuilder, WebviewUrl};

use crate::{preview_navigation_allowed, runtime_url};

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewState {
    pub app_id: String,
    pub route_path: String,
    pub url: String,
    pub status: &'static str,
}

pub struct PreviewManager {
    active: Mutex<Option<(PreviewState, Webview)>>,
}

impl Default for PreviewManager {
    fn default() -> Self {
        Self {
            active: Mutex::new(None),
        }
    }
}

impl PreviewManager {
    pub fn open(
        &self,
        app: &tauri::AppHandle,
        app_id: &str,
        route_path: &str,
        bounds: PreviewBounds,
    ) -> Result<PreviewState, String> {
        self.close()?;
        let bounds = normalize_bounds(bounds)?;
        let url = runtime_url(app_id, route_path)?;
        let parsed: tauri::Url = url.parse().map_err(|_| "Invalid preview URL")?;
        let allowed_app = app_id.to_owned();
        let builder = WebviewBuilder::new("runtime-preview", WebviewUrl::External(parsed))
            .on_navigation(move |candidate| {
                preview_navigation_allowed(&allowed_app, candidate.as_str())
            })
            .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny)
            .on_download(|_, _| false);
        let window = app.get_window("main").ok_or("Main window is unavailable")?;
        let webview = window
            .add_child(
                builder,
                LogicalPosition::new(bounds.x, bounds.y),
                LogicalSize::new(bounds.width.max(1.0), bounds.height.max(1.0)),
            )
            .map_err(|error| format!("Unable to create preview: {error}"))?;
        let state = PreviewState {
            app_id: app_id.to_owned(),
            route_path: route_path.to_owned(),
            url,
            status: "ready",
        };
        *self.active.lock().map_err(|_| "Preview lock poisoned")? = Some((state.clone(), webview));
        Ok(state)
    }

    pub fn bounds(&self, bounds: PreviewBounds) -> Result<(), String> {
        let bounds = normalize_bounds(bounds)?;
        let guard = self.active.lock().map_err(|_| "Preview lock poisoned")?;
        let (_, webview) = guard.as_ref().ok_or("Preview is not open")?;
        webview
            .set_position(LogicalPosition::new(bounds.x, bounds.y))
            .map_err(|e| e.to_string())?;
        webview
            .set_size(LogicalSize::new(
                bounds.width.max(1.0),
                bounds.height.max(1.0),
            ))
            .map_err(|e| e.to_string())
    }

    pub fn navigate(&self, app_id: &str, route_path: &str) -> Result<PreviewState, String> {
        let url = runtime_url(app_id, route_path)?;
        let parsed = url.parse().map_err(|_| "Invalid preview URL")?;
        let mut guard = self.active.lock().map_err(|_| "Preview lock poisoned")?;
        let (state, webview) = guard.as_mut().ok_or("Preview is not open")?;
        if state.app_id != app_id {
            return Err("Preview belongs to another runtime".into());
        }
        webview.navigate(parsed).map_err(|e| e.to_string())?;
        state.route_path = route_path.to_owned();
        state.url = url;
        Ok(state.clone())
    }

    pub fn eval(&self, script: &str) -> Result<(), String> {
        let guard = self.active.lock().map_err(|_| "Preview lock poisoned")?;
        guard
            .as_ref()
            .ok_or("Preview is not open")?
            .1
            .eval(script)
            .map_err(|e| e.to_string())
    }

    pub fn reload(&self) -> Result<(), String> {
        let guard = self.active.lock().map_err(|_| "Preview lock poisoned")?;
        guard
            .as_ref()
            .ok_or("Preview is not open")?
            .1
            .reload()
            .map_err(|e| e.to_string())
    }

    pub fn close(&self) -> Result<(), String> {
        if let Some((_, webview)) = self
            .active
            .lock()
            .map_err(|_| "Preview lock poisoned")?
            .take()
        {
            webview.close().map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn active_state(&self) -> Result<Option<PreviewState>, String> {
        Ok(self
            .active
            .lock()
            .map_err(|_| "Preview lock poisoned")?
            .as_ref()
            .map(|(state, _)| state.clone()))
    }
}

fn normalize_bounds(bounds: PreviewBounds) -> Result<PreviewBounds, String> {
    if !bounds.x.is_finite()
        || !bounds.y.is_finite()
        || !bounds.width.is_finite()
        || !bounds.height.is_finite()
        || bounds.width <= 0.0
        || bounds.height <= 0.0
    {
        return Err("Preview bounds must be finite and positive".into());
    }
    Ok(PreviewBounds {
        x: bounds.x.clamp(0.0, 16_384.0),
        y: bounds.y.clamp(0.0, 16_384.0),
        width: bounds.width.min(16_384.0),
        height: bounds.height.min(16_384.0),
    })
}

#[cfg(test)]
mod tests {
    use super::{normalize_bounds, PreviewBounds};

    #[test]
    fn preview_bounds_are_safe_and_clamped() {
        let bounds = normalize_bounds(PreviewBounds {
            x: -10.0,
            y: 20_000.0,
            width: 20_000.0,
            height: 720.0,
        })
        .unwrap();
        assert_eq!(
            (bounds.x, bounds.y, bounds.width),
            (0.0, 16_384.0, 16_384.0)
        );
        assert!(normalize_bounds(PreviewBounds {
            x: 0.0,
            y: 0.0,
            width: f64::NAN,
            height: 1.0,
        })
        .is_err());
    }
}
