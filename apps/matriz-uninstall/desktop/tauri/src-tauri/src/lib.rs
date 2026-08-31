use base64::Engine;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{collections::HashMap, fs, path::{Path, PathBuf}, process::Command, sync::Mutex};
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
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalInstallerViewModel {
    installer_id: String, product_id: String, display_name: String, version: String,
    size_bytes: u64, sha256: String, trust: String, is_latest_for_product: bool,
    is_downgrade: bool, message: String,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct InstallerOperationSnapshot {
    operation_id: String, product_id: String, version: String, phase: String,
    bytes_downloaded: u64, total_bytes: Option<u64>, required_acknowledgements: Vec<String>, message: String,
}
#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
enum InstallerSource { Remote { product_id: String }, Local { installer_id: String } }
#[derive(Clone)]
struct LocalInstallerRecord { path: PathBuf, view: LocalInstallerViewModel }
#[derive(Default)]
struct LocalInstallerState {
    folders: Mutex<HashMap<String, PathBuf>>,
    installers: Mutex<HashMap<String, LocalInstallerRecord>>,
    operations: Mutex<HashMap<String, InstallerOperationSnapshot>>,
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
fn choose_local_installer_folder(state: State<LocalInstallerState>) -> Result<Option<serde_json::Value>, String> {
    let script = r#"Add-Type -AssemblyName System.Windows.Forms; $d=New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description='Selecione uma pasta com instaladores Matriz'; if($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK){$d.SelectedPath}"#;
    let raw = powershell(script)?;
    let value = raw.trim();
    if value.is_empty() { return Ok(None); }
    let path = PathBuf::from(value);
    if !path.is_absolute() || !path.is_dir() { return Err("Pasta local inválida".into()); }
    let folder_id = Uuid::new_v4().to_string();
    state.folders.lock().map_err(|_| "Catálogo local indisponível")?.insert(folder_id.clone(), path.clone());
    Ok(Some(serde_json::json!({ "folderId": folder_id, "label": path.file_name().and_then(|v|v.to_str()).unwrap_or("Pasta local") })))
}

#[tauri::command]
fn scan_local_installers(folder_id: String, state: State<LocalInstallerState>) -> Result<Vec<LocalInstallerViewModel>, String> {
    let folder = state.folders.lock().map_err(|_| "Catálogo local indisponível")?.get(&folder_id).cloned().ok_or("Pasta local não pertence à sessão atual")?;
    let mut views = Vec::new();
    for entry in fs::read_dir(folder).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if !entry.file_type().map_err(|e| e.to_string())?.is_file() || path.extension().and_then(|v|v.to_str()).map(|v|!v.eq_ignore_ascii_case("exe")).unwrap_or(true) { continue; }
        let size = entry.metadata().map_err(|e| e.to_string())?.len();
        if size == 0 || size > MAX_INSTALLER_BYTES { continue; }
        let bytes = fs::read(&path).map_err(|e| e.to_string())?;
        let sha256 = format!("{:x}", Sha256::digest(&bytes));
        let installer_id = sha256[..24].to_string();
        let signed = authenticode_is_matriz(&path);
        let view = classify_local_file(path.file_name().and_then(|v|v.to_str()).unwrap_or(""), &installer_id, size, &sha256, signed);
        state.installers.lock().map_err(|_| "Catálogo local indisponível")?.insert(installer_id, LocalInstallerRecord { path, view: view.clone() });
        views.push(view);
    }
    mark_latest(&mut views);
    Ok(views)
}

#[tauri::command]
fn prepare_installer(source: InstallerSource, action: String, state: State<LocalInstallerState>) -> Result<InstallerOperationSnapshot, String> {
    let (product_id, version, total_bytes, required) = match source {
        InstallerSource::Local { installer_id } => {
            let record = state.installers.lock().map_err(|_| "Catálogo local indisponível")?.get(&installer_id).cloned().ok_or("Instalador local expirou")?;
            let required = if record.view.trust == "unsigned-development" { vec!["unsigned-development".into()] } else { vec![] };
            (record.view.product_id, record.view.version, Some(record.view.size_bytes), required)
        },
        InstallerSource::Remote { product_id } => (product_id, "0.0.0".into(), None, vec![]),
    };
    let snapshot = InstallerOperationSnapshot { operation_id: Uuid::new_v4().to_string(), product_id, version, phase: "awaiting_confirmation".into(), bytes_downloaded: 0, total_bytes, required_acknowledgements: required, message: format!("Pronto para {action}.") };
    state.operations.lock().map_err(|_| "Operações indisponíveis")?.insert(snapshot.operation_id.clone(), snapshot.clone());
    Ok(snapshot)
}

#[tauri::command]
fn confirm_installer(operation_id: String, acknowledgements: Vec<String>, state: State<LocalInstallerState>) -> Result<InstallerOperationSnapshot, String> {
    let operation = state.operations.lock().map_err(|_| "Operações indisponíveis")?.get(&operation_id).cloned().ok_or("Operação expirada")?;
    if operation.required_acknowledgements.iter().any(|item| !acknowledgements.contains(item)) { return Err("Confirmação adicional obrigatória".into()); }
    let record = state.installers.lock().map_err(|_| "Catálogo local indisponível")?.values().find(|item| item.view.product_id == operation.product_id && item.view.version == operation.version).cloned().ok_or("Instalador local expirou")?;
    let bytes = fs::read(&record.path).map_err(|e| e.to_string())?;
    if format!("{:x}", Sha256::digest(&bytes)) != record.view.sha256 { return Err("Arquivo local mudou após a inspeção".into()); }
    if record.view.trust == "signed-matriz" && !authenticode_is_matriz(&record.path) { return Err("Assinatura local mudou após a inspeção".into()); }
    let status = Command::new(&record.path).arg("/S").status().map_err(|e| e.to_string())?;
    if !status.success() { return Err(format!("Instalador terminou com {status}")); }
    let completed = InstallerOperationSnapshot { phase: "completed".into(), message: "Instalação concluída e validada.".into(), ..operation };
    state.operations.lock().map_err(|_| "Operações indisponíveis")?.insert(operation_id, completed.clone());
    Ok(completed)
}

#[tauri::command]
fn cancel_installer(operation_id: String, state: State<LocalInstallerState>) -> Result<InstallerOperationSnapshot, String> {
    let current = state.operations.lock().map_err(|_| "Operações indisponíveis")?.get(&operation_id).cloned().ok_or("Operação expirada")?;
    if current.phase == "installing" { return Err("Instalador já foi iniciado".into()); }
    let cancelled = InstallerOperationSnapshot { phase: "cancelled".into(), message: "Operação cancelada.".into(), ..current };
    state.operations.lock().map_err(|_| "Operações indisponíveis")?.insert(operation_id, cancelled.clone());
    Ok(cancelled)
}

#[tauri::command]
fn installer_operation(operation_id: String, state: State<LocalInstallerState>) -> Result<InstallerOperationSnapshot, String> {
    state.operations.lock().map_err(|_| "Operações indisponíveis")?.get(&operation_id).cloned().ok_or("Operação expirada".into())
}

fn classify_local_file(file_name: &str, installer_id: &str, size_bytes: u64, sha256: &str, signed: bool) -> LocalInstallerViewModel {
    let lower = file_name.to_ascii_lowercase();
    let definitions = [
        ("matriz-control-tauri", "matriz-control-", "Matriz Control"),
        ("matriz-control-electron", "matriz-control-electron-", "Matriz Control Electron"),
        ("matriz-admin-tauri", "matriz-admin-", "Matriz Admin"),
        ("matriz-ops-tauri", "matriz-ops-", "Matriz Ops"),
        ("matriz-uninstall-tauri", "matriz-uninstall-", "Matriz Uninstall"),
        ("matriz-uninstall-electron", "matriz-uninstall-electron-", "Matriz Uninstall Electron"),
        ("matriz-workbench-electron", "matriz-workbench-", "Matriz Workbench"),
        ("seumei-electron", "seumei-", "Seumei"),
    ];
    let matched = definitions.iter().find_map(|(product, prefix, display)| {
        let suffix = lower.strip_prefix(prefix)?.strip_suffix("-windows-x64-setup.exe")?;
        if valid_semver(suffix) { Some((*product, *display, suffix.to_string())) } else { None }
    });
    match matched {
        Some((product_id, display_name, version)) => LocalInstallerViewModel {
            installer_id: installer_id.into(), product_id: product_id.into(), display_name: display_name.into(), version,
            size_bytes, sha256: sha256.into(), trust: if signed { "signed-matriz".into() } else { "unsigned-development".into() },
            is_latest_for_product: false, is_downgrade: false,
            message: if signed { "Assinatura Matriz válida.".into() } else { "Build local de desenvolvimento não assinado.".into() },
        },
        None => LocalInstallerViewModel { installer_id: installer_id.into(), product_id: "unknown".into(), display_name: file_name.into(), version: "0.0.0".into(), size_bytes, sha256: sha256.into(), trust: "blocked".into(), is_latest_for_product: false, is_downgrade: false, message: "Arquivo não corresponde a um produto Matriz permitido.".into() },
    }
}

fn valid_semver(value: &str) -> bool {
    let parts: Vec<_> = value.split('.').collect();
    parts.len() == 3 && parts.iter().all(|part| !part.is_empty() && part.chars().all(|c| c.is_ascii_digit()))
}
fn version_parts(value: &str) -> (u64, u64, u64) { let mut p=value.split('.').map(|v|v.parse().unwrap_or(0)); (p.next().unwrap_or(0),p.next().unwrap_or(0),p.next().unwrap_or(0)) }
fn mark_latest(items: &mut [LocalInstallerViewModel]) {
    let mut latest: HashMap<String, (u64,u64,u64)> = HashMap::new();
    for item in items.iter().filter(|item| item.trust != "blocked") { let version=version_parts(&item.version); if latest.get(&item.product_id).map(|v|version>*v).unwrap_or(true) { latest.insert(item.product_id.clone(),version); } }
    for item in items.iter_mut() { item.is_latest_for_product = item.trust != "blocked" && latest.get(&item.product_id) == Some(&version_parts(&item.version)); }
    items.sort_by(|a,b| a.product_id.cmp(&b.product_id).then_with(|| version_parts(&b.version).cmp(&version_parts(&a.version))));
}
fn authenticode_is_matriz(path: &Path) -> bool {
    let escaped = path.to_string_lossy().replace('\'', "''");
    powershell(&format!("Get-AuthenticodeSignature -LiteralPath '{escaped}' | Select-Object Status,@{{n='Subject';e={{$_.SignerCertificate.Subject}}}} | ConvertTo-Json -Compress"))
        .ok().and_then(|raw| serde_json::from_str::<serde_json::Value>(raw.trim()).ok())
        .map(|value| value["Status"] == "Valid" && value["Subject"].as_str().unwrap_or("").split(',').any(|part| matches!(part.trim(), "CN=Matriz" | "O=Matriz"))).unwrap_or(false)
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
        .manage(LocalInstallerState::default())
        .invoke_handler(tauri::generate_handler![
            list_installed,
            install_product,
            update_product,
            reinstall_product,
            uninstall_product,
            cleanup_preview,
            cleanup_product,
            self_uninstall,
            choose_local_installer_folder,
            scan_local_installers,
            prepare_installer,
            confirm_installer,
            cancel_installer,
            installer_operation
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
    #[test]
    fn classifies_local_versions_without_exposing_paths() {
        let item = classify_local_file("matriz-control-1.0.0-windows-x64-setup.exe", "opaque", 10, &"a".repeat(64), false);
        assert_eq!(item.product_id, "matriz-control-tauri");
        assert_eq!(item.version, "1.0.0");
        assert_eq!(item.trust, "unsigned-development");
    }
}
