use base64::Engine;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{collections::HashMap, fs, process::Command, sync::Mutex};
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;
const MAX_INSTALLER_BYTES: u64 = 512 * 1024 * 1024;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InstalledProduct {
    installation_id: String,
    registry_key: String,
    display_name: String,
    publisher: String,
    version: Option<String>,
    install_location: Option<String>,
    estimated_bytes: u64,
    #[serde(skip_serializing)]
    uninstall_command: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OperationResult {
    operation_id: String,
    status: String,
    message: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CleanupCandidate {
    id: String,
    category: String,
    display_path: String,
    estimated_bytes: u64,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Catalog {
    products: Vec<CatalogProduct>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CatalogProduct {
    product_id: String,
    windows: CatalogWindows,
    release: Option<CatalogRelease>,
}
#[derive(Deserialize)]
struct CatalogWindows {
    publisher: String,
}
#[derive(Deserialize)]
struct CatalogRelease {
    version: String,
    status: String,
    signature: String,
    installer: CatalogInstaller,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CatalogInstaller {
    file_name: String,
    download_url: String,
    size_bytes: u64,
    sha256: String,
}
#[derive(Default)]
struct Inspection(Mutex<HashMap<String, InstalledProduct>>);

fn outcome(status: &str, message: impl Into<String>) -> OperationResult {
    OperationResult {
        operation_id: Uuid::new_v4().to_string(),
        status: status.into(),
        message: message.into(),
    }
}
fn powershell(script: &str) -> Result<String, String> {
    let output = Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .output()
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).into());
    }
    Ok(String::from_utf8_lossy(&output.stdout).into())
}

#[tauri::command]
fn list_installed(state: State<Inspection>) -> Result<Vec<InstalledProduct>, String> {
    let script = r#"$roots=@('HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'); Get-ItemProperty $roots -ErrorAction SilentlyContinue | Where-Object {$_.DisplayName -match '^(Matriz|Seu ?Mei)'} | Select-Object PSPath,DisplayName,Publisher,DisplayVersion,InstallLocation,EstimatedSize,QuietUninstallString,UninstallString | ConvertTo-Json -Compress"#;
    let raw = powershell(script)?;
    let value: serde_json::Value =
        serde_json::from_str(raw.trim()).unwrap_or(serde_json::json!([]));
    let rows = match value {
        serde_json::Value::Array(v) => v,
        v => vec![v],
    };
    let mut found = Vec::new();
    for row in rows {
        let name = row["DisplayName"].as_str().unwrap_or("").to_string();
        let command = row["QuietUninstallString"]
            .as_str()
            .or_else(|| row["UninstallString"].as_str())
            .unwrap_or("")
            .to_string();
        if name.is_empty() || command.is_empty() {
            continue;
        }
        let key = row["PSPath"].as_str().unwrap_or("").to_string();
        let id = format!("{:x}", Sha256::digest(key.as_bytes()))[..24].to_string();
        found.push(InstalledProduct {
            installation_id: id,
            registry_key: key,
            display_name: name,
            publisher: row["Publisher"].as_str().unwrap_or("").into(),
            version: row["DisplayVersion"].as_str().map(Into::into),
            install_location: row["InstallLocation"].as_str().map(Into::into),
            estimated_bytes: row["EstimatedSize"].as_u64().unwrap_or(0) * 1024,
            uninstall_command: command,
        });
    }
    let mut snapshot = state.0.lock().map_err(|_| "Inspeção indisponível")?;
    snapshot.clear();
    for item in &found {
        snapshot.insert(item.installation_id.clone(), item.clone());
    }
    Ok(found)
}
fn safe_command(command: &str) -> Result<(String, Vec<String>), String> {
    if command.chars().any(|c| "&|<>`\r\n".contains(c)) {
        return Err("Operador de shell recusado".into());
    }
    let trimmed = command.trim();
    let (exe, rest) = if let Some(after) = trimmed.strip_prefix('"') {
        let end = after.find('"').ok_or("Aspas inválidas")?;
        (after[..end].to_string(), after[end + 1..].trim())
    } else {
        let end = trimmed.find(char::is_whitespace).unwrap_or(trimmed.len());
        (trimmed[..end].to_string(), trimmed[end..].trim())
    };
    let lower = exe.to_lowercase();
    if !(lower.contains("unins") || lower.contains("uninstall") || lower.ends_with("msiexec.exe")) {
        return Err("Desinstalador não aprovado".into());
    }
    let args = rest
        .split_whitespace()
        .map(|s| s.trim_matches('"').to_string())
        .collect();
    Ok((exe, args))
}
#[tauri::command]
fn uninstall_product(installation_id: String, state: State<Inspection>) -> OperationResult {
    let item = state
        .0
        .lock()
        .ok()
        .and_then(|s| s.get(&installation_id).cloned());
    let Some(item) = item else {
        return outcome("failed", "Instalação não pertence à inspeção atual");
    };
    if item.publisher != "Matriz" {
        return outcome("failed", "Publisher do produto não foi aprovado");
    }
    match safe_command(&item.uninstall_command).and_then(|(exe, args)| {
        Command::new(exe)
            .args(args)
            .status()
            .map_err(|e| e.to_string())
    }) {
        Ok(status) if status.success() => outcome(
            "completed",
            "Desinstalador oficial concluído; atualize a inspeção para confirmar",
        ),
        Ok(status) => outcome("failed", format!("Desinstalador terminou com {status}")),
        Err(error) => outcome("failed", error),
    }
}
fn verified_install(product_id: &str, app: &AppHandle) -> Result<(), String> {
    let hub = std::env::var("MATRIZ_HUB_URL").unwrap_or_else(|_| "http://127.0.0.1:3000".into());
    let client = reqwest::blocking::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|e| e.to_string())?;
    let catalog: Catalog = client
        .get(format!("{hub}/api/v1/distribution/catalog"))
        .send()
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .json()
        .map_err(|e| e.to_string())?;
    let product = catalog
        .products
        .into_iter()
        .find(|p| p.product_id == product_id)
        .ok_or("Produto ausente do catálogo")?;
    let release = product.release.ok_or("Nenhuma release publicada")?;
    if release.status != "published" {
        return Err("Release não publicada".into());
    }
    let public = std::env::var("MATRIZ_DISTRIBUTION_PUBLIC_KEY")
        .map_err(|_| "Chave pública de distribuição não configurada")?;
    let key_bytes = base64::engine::general_purpose::STANDARD
        .decode(public)
        .map_err(|_| "Chave pública inválida")?;
    let key = VerifyingKey::from_bytes(
        key_bytes
            .as_slice()
            .try_into()
            .map_err(|_| "Chave pública deve ter 32 bytes")?,
    )
    .map_err(|e| e.to_string())?;
    let signature_bytes = base64::engine::general_purpose::STANDARD
        .decode(&release.signature)
        .map_err(|_| "Assinatura inválida")?;
    let signature = Signature::from_slice(&signature_bytes).map_err(|e| e.to_string())?;
    let canonical = format!(
        "{}\n{}\n{}\n{}\n{}",
        product.product_id,
        release.version,
        release.installer.download_url,
        release.installer.size_bytes,
        release.installer.sha256
    );
    key.verify(canonical.as_bytes(), &signature)
        .map_err(|_| "Assinatura do manifesto inválida")?;
    if release.installer.size_bytes == 0 || release.installer.size_bytes > MAX_INSTALLER_BYTES {
        return Err("Tamanho do instalador está fora do limite permitido".into());
    }
    if !release.installer.file_name.to_lowercase().ends_with(".exe")
        || std::path::Path::new(&release.installer.file_name)
            .file_name()
            .and_then(|v| v.to_str())
            != Some(release.installer.file_name.as_str())
    {
        return Err("Nome do instalador é inválido".into());
    }
    if release.installer.sha256.len() != 64
        || !release
            .installer
            .sha256
            .chars()
            .all(|c| c.is_ascii_hexdigit())
    {
        return Err("SHA-256 do manifesto é inválido".into());
    }
    let url = reqwest::Url::parse(&release.installer.download_url).map_err(|e| e.to_string())?;
    if url.scheme() != "https" {
        return Err("Instalador está fora de HTTPS".into());
    }
    let response = client
        .get(url)
        .send()
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?;
    if response
        .content_length()
        .is_some_and(|n| n != release.installer.size_bytes)
    {
        return Err("Content-Length diverge do manifesto".into());
    }
    let bytes = response.bytes().map_err(|e| e.to_string())?;
    if bytes.len() as u64 != release.installer.size_bytes {
        return Err("Tamanho do instalador diverge".into());
    }
    if format!("{:x}", Sha256::digest(&bytes)) != release.installer.sha256 {
        return Err("SHA-256 inválido".into());
    }
    let cache = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("installers");
    fs::create_dir_all(&cache).map_err(|e| e.to_string())?;
    let target = cache.join(&release.installer.file_name);
    fs::write(&target, &bytes).map_err(|e| e.to_string())?;
    let escaped = target.to_string_lossy().replace('\'', "''");
    let trust=powershell(&format!("Get-AuthenticodeSignature -LiteralPath '{escaped}' | Select-Object Status,@{{n='Subject';e={{$_.SignerCertificate.Subject}}}} | ConvertTo-Json -Compress"))?;
    let value: serde_json::Value = serde_json::from_str(trust.trim()).map_err(|e| e.to_string())?;
    if value["Status"] != "Valid"
        || !value["Subject"]
            .as_str()
            .unwrap_or("")
            .to_lowercase()
            .contains(&product.windows.publisher.to_lowercase())
    {
        return Err("Authenticode ou publisher inválido".into());
    }
    let status = Command::new(target)
        .arg("/S")
        .status()
        .map_err(|e| e.to_string())?;
    if !status.success() {
        return Err(format!("Instalador terminou com {status}"));
    }
    Ok(())
}
#[tauri::command]
fn install_product(product_id: String, app: AppHandle) -> OperationResult {
    match verified_install(&product_id, &app) {
        Ok(()) => outcome("completed", "Instalador assinado concluído"),
        Err(e) => outcome("failed", e),
    }
}
#[tauri::command]
fn update_product(product_id: String, app: AppHandle) -> OperationResult {
    install_product(product_id, app)
}
#[tauri::command]
fn reinstall_product(
    product_id: String,
    installation_id: String,
    app: AppHandle,
    state: State<Inspection>,
) -> OperationResult {
    let removed = uninstall_product(installation_id, state);
    if removed.status == "completed" {
        install_product(product_id, app)
    } else {
        removed
    }
}
#[tauri::command]
fn cleanup_preview(_product_id: String) -> Vec<CleanupCandidate> {
    Vec::new()
}
#[tauri::command]
fn cleanup_product(_product_id: String, candidate_ids: Vec<String>) -> OperationResult {
    if candidate_ids.is_empty() {
        outcome("cancelled", "Nenhum resíduo allowlisted selecionado")
    } else {
        outcome("failed", "Os candidatos expiraram; execute nova inspeção")
    }
}
#[tauri::command]
fn self_uninstall(app: AppHandle, state: State<Inspection>) -> OperationResult {
    let own = state.0.lock().ok().and_then(|s| {
        s.values()
            .find(|i| i.display_name == "Matriz Uninstall Tauri")
            .cloned()
    });
    let Some(item) = own else {
        return outcome("failed", "Auto-desinstalador registrado não encontrado");
    };
    match safe_command(&item.uninstall_command) {
        Ok((exe, args)) => match Command::new(exe).args(args).spawn() {
            Ok(_) => {
                app.exit(0);
                outcome("completed", "Auto-desinstalador iniciado")
            }
            Err(e) => outcome("failed", e.to_string()),
        },
        Err(e) => outcome("failed", e),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Inspection::default())
        .invoke_handler(tauri::generate_handler![
            list_installed,
            install_product,
            update_product,
            reinstall_product,
            uninstall_product,
            cleanup_preview,
            cleanup_product,
            self_uninstall
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar Matriz Uninstall Tauri");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn blocks_shell_operators() {
        assert!(safe_command(r#""C:\safe\uninstall.exe" & calc.exe"#).is_err());
    }
    #[test]
    fn parses_nsis() {
        let parsed = safe_command(r#""C:\Program Files\Matriz\uninstall.exe" /S"#).unwrap();
        assert_eq!(parsed.1, vec!["/S"]);
    }
}
