use std::sync::Mutex;

use serde::Serialize;
use tauri::{ipc::Channel, AppHandle};
use tauri_plugin_updater::{Update, UpdaterExt};

const MAX_UPDATE_BYTES: u64 = 536_870_912;

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub state: &'static str,
    pub current_version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProgress {
    pub downloaded_bytes: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_bytes: Option<u64>,
}

struct PendingUpdate {
    update: Update,
    bytes: Option<Vec<u8>>,
    size_bytes: Option<u64>,
}

#[derive(Default)]
pub struct UpdateManager {
    pending: Mutex<Option<PendingUpdate>>,
}

impl UpdateManager {
    pub async fn check(&self, app: &AppHandle) -> Result<UpdateInfo, String> {
        let current_version = app.package_info().version.to_string();
        let (endpoint, public_key) = configured_updater(
            option_env!("MATRIZ_CONTROL_UPDATER_ENDPOINT"),
            option_env!("MATRIZ_CONTROL_UPDATER_PUBLIC_KEY"),
        )?;
        let endpoint = endpoint
            .parse()
            .map_err(|error| format!("Endpoint de atualização inválido: {error}"))?;
        let update = app
            .updater_builder()
            .pubkey(public_key)
            .endpoints(vec![endpoint])
            .map_err(|error| error.to_string())?
            .build()
            .map_err(|error| error.to_string())?
            .check()
            .await
            .map_err(|error| error.to_string())?;
        let Some(update) = update else {
            *self
                .pending
                .lock()
                .map_err(|_| "Updater indisponível".to_string())? = None;
            return Ok(UpdateInfo {
                state: "current",
                current_version,
                version: None,
                notes: None,
                size_bytes: None,
                reason: None,
            });
        };
        if update.download_url.scheme() != "https" {
            return Err("O artefato de atualização não usa HTTPS".into());
        }
        let size_bytes = update
            .raw_json
            .get("size_bytes")
            .and_then(serde_json::Value::as_u64);
        if size_bytes.is_some_and(|size| size > MAX_UPDATE_BYTES) {
            return Err("A atualização excede o limite de 512 MiB".into());
        }
        let info = available_info(&update, size_bytes, "available");
        *self
            .pending
            .lock()
            .map_err(|_| "Updater indisponível".to_string())? = Some(PendingUpdate {
            update,
            bytes: None,
            size_bytes,
        });
        Ok(info)
    }

    pub async fn download(&self, on_event: Channel<UpdateProgress>) -> Result<UpdateInfo, String> {
        let (update, declared_size) = {
            let pending = self
                .pending
                .lock()
                .map_err(|_| "Updater indisponível".to_string())?;
            let pending = pending
                .as_ref()
                .ok_or("Verifique atualizações antes de baixar")?;
            (pending.update.clone(), pending.size_bytes)
        };
        let mut downloaded_bytes = 0_u64;
        let bytes = update
            .download(
                |chunk, total| {
                    downloaded_bytes = downloaded_bytes.saturating_add(chunk as u64);
                    let _ = on_event.send(UpdateProgress {
                        downloaded_bytes,
                        total_bytes: total.or(declared_size),
                    });
                },
                || {},
            )
            .await
            .map_err(|error| error.to_string())?;
        if bytes.len() as u64 > MAX_UPDATE_BYTES {
            return Err("A atualização excede o limite de 512 MiB".into());
        }
        let info = available_info(&update, Some(bytes.len() as u64), "downloaded");
        let mut pending = self
            .pending
            .lock()
            .map_err(|_| "Updater indisponível".to_string())?;
        let current = pending
            .as_mut()
            .ok_or("A atualização deixou de estar disponível")?;
        if current.update.version != update.version {
            return Err("A atualização mudou durante o download; verifique novamente".into());
        }
        current.bytes = Some(bytes);
        current.size_bytes = info.size_bytes;
        Ok(info)
    }

    pub fn install(&self) -> Result<(), String> {
        let pending = self
            .pending
            .lock()
            .map_err(|_| "Updater indisponível".to_string())?
            .take()
            .ok_or("Nenhuma atualização foi baixada")?;
        let bytes = pending
            .bytes
            .ok_or("Baixe a atualização antes de instalar")?;
        pending
            .update
            .install(bytes)
            .map_err(|error| error.to_string())
    }
}

fn available_info(update: &Update, size_bytes: Option<u64>, state: &'static str) -> UpdateInfo {
    UpdateInfo {
        state,
        current_version: update.current_version.clone(),
        version: Some(update.version.clone()),
        notes: update.body.clone(),
        size_bytes,
        reason: None,
    }
}

fn configured_updater<'a>(
    endpoint: Option<&'a str>,
    public_key: Option<&'a str>,
) -> Result<(&'a str, &'a str), String> {
    let endpoint = endpoint
        .filter(|value| !value.trim().is_empty())
        .ok_or("Atualizações públicas ainda não foram configuradas nesta compilação")?;
    let public_key = public_key
        .filter(|value| !value.trim().is_empty())
        .ok_or("A chave pública do updater não foi configurada nesta compilação")?;
    if !endpoint.starts_with("https://") {
        return Err("O endpoint de atualização deve usar HTTPS".into());
    }
    Ok((endpoint, public_key))
}

#[cfg(test)]
mod tests {
    use super::configured_updater;

    #[test]
    fn configuration_fails_closed_without_https_endpoint_or_public_key() {
        assert!(configured_updater(None, Some("public")).is_err());
        assert!(configured_updater(Some("http://localhost/update"), Some("public")).is_err());
        assert!(configured_updater(Some("https://hub.example/update"), None).is_err());
        assert_eq!(
            configured_updater(Some("https://hub.example/update"), Some("public")),
            Ok(("https://hub.example/update", "public"))
        );
    }
}
