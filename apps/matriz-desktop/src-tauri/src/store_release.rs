use std::{
    collections::HashMap,
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

use base64::{engine::general_purpose::STANDARD, Engine};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

const MAX_INSTALLER_BYTES: u64 = 536_870_912;
const CONFIRMATION_TTL_MILLIS: u128 = 10 * 60 * 1_000;

pub trait StoreInstallHost: Send + Sync {
    fn catalog(&self) -> Result<Vec<u8>, String>;
    fn download(&self, url: &str, limit: u64) -> Result<Vec<u8>, String>;
    fn install(&self, path: &Path, publisher: &str) -> Result<(), String>;
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoreInstallPreview {
    pub confirmation_token: String,
    pub product_id: String,
    pub display_name: &'static str,
    pub version: String,
    pub size_bytes: u64,
    pub publisher: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoreInstallReceipt {
    pub product_id: String,
    pub distribution_product_id: String,
    pub release_id: String,
    pub version: String,
    pub sha256: String,
    pub installed_at: u128,
}

#[derive(Clone)]
struct PendingInstall {
    package_id: String,
    release: VerifiedRelease,
    expires_at: u128,
}

pub struct StoreInstallManager {
    root: PathBuf,
    public_key: String,
    allowed_hosts: Vec<String>,
    host: Box<dyn StoreInstallHost>,
    pending: Mutex<HashMap<String, PendingInstall>>,
}

impl StoreInstallManager {
    pub fn with_host(
        root: PathBuf,
        public_key: String,
        allowed_hosts: Vec<String>,
        host: Box<dyn StoreInstallHost>,
    ) -> Self {
        Self {
            root,
            public_key,
            allowed_hosts,
            host,
            pending: Mutex::new(HashMap::new()),
        }
    }

    pub fn preview(&self, package_id: &str) -> Result<StoreInstallPreview, String> {
        let (distribution_product_id, display_name) = installable_product(package_id)?;
        let catalog = self.host.catalog()?;
        let hosts = self
            .allowed_hosts
            .iter()
            .map(String::as_str)
            .collect::<Vec<_>>();
        let release =
            verify_catalog_release(&catalog, distribution_product_id, &self.public_key, &hosts)?;
        let token = uuid::Uuid::new_v4().to_string();
        self.pending
            .lock()
            .map_err(|_| "Store confirmation state is unavailable")?
            .insert(
                token.clone(),
                PendingInstall {
                    package_id: package_id.into(),
                    release: release.clone(),
                    expires_at: now().saturating_add(CONFIRMATION_TTL_MILLIS),
                },
            );
        Ok(StoreInstallPreview {
            confirmation_token: token,
            product_id: package_id.into(),
            display_name,
            version: release.version,
            size_bytes: release.size_bytes,
            publisher: release.expected_publisher,
        })
    }

    pub fn confirm(&self, confirmation_token: &str) -> Result<StoreInstallReceipt, String> {
        let pending = self
            .pending
            .lock()
            .map_err(|_| "Store confirmation state is unavailable")?
            .remove(confirmation_token)
            .ok_or("Store confirmation token is invalid or was already used")?;
        if pending.expires_at < now() {
            return Err("Store confirmation token expired".into());
        }
        let (distribution_product_id, _) = installable_product(&pending.package_id)?;
        let catalog = self.host.catalog()?;
        let hosts = self
            .allowed_hosts
            .iter()
            .map(String::as_str)
            .collect::<Vec<_>>();
        let release =
            verify_catalog_release(&catalog, distribution_product_id, &self.public_key, &hosts)?;
        if release != pending.release {
            return Err("A release mudou depois da prévia; revise a instalação novamente".into());
        }
        let bytes = self
            .host
            .download(&release.download_url, release.size_bytes)?;
        let installer =
            persist_verified_installer(&self.root.join("installers"), &release, &bytes)?;
        verify_installer_file(&release, &installer)?;
        self.host.install(&installer, &release.expected_publisher)?;
        let receipt = StoreInstallReceipt {
            product_id: pending.package_id,
            distribution_product_id: release.product_id,
            release_id: release.release_id,
            version: release.version,
            sha256: release.sha256,
            installed_at: now(),
        };
        persist_receipt(&self.root.join("receipts"), &receipt)?;
        Ok(receipt)
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VerifiedRelease {
    pub product_id: String,
    pub release_id: String,
    pub version: String,
    pub file_name: String,
    pub download_url: String,
    pub size_bytes: u64,
    pub sha256: String,
    pub expected_publisher: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Catalog {
    schema_version: String,
    products: Vec<Product>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Product {
    product_id: String,
    runtime: String,
    platform: String,
    arch: String,
    state: String,
    windows: WindowsIdentity,
    release: Option<Release>,
}

#[derive(Deserialize)]
struct WindowsIdentity {
    publisher: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Release {
    release_id: String,
    version: String,
    channel: String,
    installer: Installer,
    signature: String,
    status: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Installer {
    file_name: String,
    download_url: String,
    size_bytes: u64,
    sha256: String,
}

pub fn verify_catalog_release(
    bytes: &[u8],
    expected_product_id: &str,
    public_key: &str,
    allowed_hosts: &[&str],
) -> Result<VerifiedRelease, String> {
    let catalog: Catalog = serde_json::from_slice(bytes)
        .map_err(|error| format!("Catálogo de distribuição inválido: {error}"))?;
    if catalog.schema_version != "v1" {
        return Err("Versão do catálogo de distribuição não é suportada".into());
    }
    let product = catalog
        .products
        .into_iter()
        .find(|product| product.product_id == expected_product_id)
        .ok_or("Produto ausente do catálogo confiável")?;
    if product.state != "active"
        || product.platform != "win32"
        || product.arch != "x64"
        || !matches!(product.runtime.as_str(), "tauri" | "electron" | "native")
    {
        return Err("Produto não está disponível para instalação no Windows x64".into());
    }
    if product.windows.publisher != "Matriz" {
        return Err("Publisher do produto não foi aprovado".into());
    }
    let release = product
        .release
        .ok_or("Produto não possui release publicada")?;
    if release.status != "published"
        || release.channel != "stable"
        || !plain_semver(&release.version)
        || uuid::Uuid::parse_str(&release.release_id).is_err()
    {
        return Err("Release está indisponível ou possui identidade inválida".into());
    }
    validate_installer(&release.installer, allowed_hosts)?;
    verify_signature(&product.product_id, &release, public_key)?;
    Ok(VerifiedRelease {
        product_id: product.product_id,
        release_id: release.release_id,
        version: release.version,
        file_name: release.installer.file_name,
        download_url: release.installer.download_url,
        size_bytes: release.installer.size_bytes,
        sha256: release.installer.sha256,
        expected_publisher: product.windows.publisher,
    })
}

pub fn verify_installer_bytes(release: &VerifiedRelease, bytes: &[u8]) -> Result<(), String> {
    if bytes.len() as u64 != release.size_bytes {
        return Err("Tamanho do instalador diverge do manifesto assinado".into());
    }
    let actual = format!("{:x}", Sha256::digest(bytes));
    if actual != release.sha256 {
        return Err("SHA-256 do instalador diverge do manifesto assinado".into());
    }
    Ok(())
}

fn verify_installer_file(release: &VerifiedRelease, path: &Path) -> Result<(), String> {
    let bytes = fs::read(path)
        .map_err(|error| format!("Não foi possível reinspecionar o instalador: {error}"))?;
    verify_installer_bytes(release, &bytes)
}

pub fn persist_verified_installer(
    root: &Path,
    release: &VerifiedRelease,
    bytes: &[u8],
) -> Result<PathBuf, String> {
    verify_installer_bytes(release, bytes)?;
    fs::create_dir_all(root)
        .map_err(|error| format!("Não foi possível preparar o staging da Store: {error}"))?;
    let target = root.join(&release.file_name);
    if target.exists() {
        let existing = fs::read(&target)
            .map_err(|error| format!("Não foi possível reinspecionar o instalador: {error}"))?;
        verify_installer_bytes(release, &existing)?;
        return Ok(target);
    }
    let temporary = root.join(format!(
        ".{}.{}.tmp",
        release.file_name,
        uuid::Uuid::new_v4()
    ));
    let result = (|| {
        let mut file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&temporary)
            .map_err(|error| format!("Não foi possível criar o staging da Store: {error}"))?;
        file.write_all(bytes)
            .and_then(|_| file.sync_all())
            .map_err(|error| format!("Não foi possível gravar o staging da Store: {error}"))?;
        fs::rename(&temporary, &target).map_err(|error| {
            format!("Não foi possível promover o instalador verificado: {error}")
        })?;
        Ok(target.clone())
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    result
}

fn validate_installer(installer: &Installer, allowed_hosts: &[&str]) -> Result<(), String> {
    if installer.size_bytes == 0 || installer.size_bytes > MAX_INSTALLER_BYTES {
        return Err("Tamanho do instalador está fora do limite permitido".into());
    }
    let name = Path::new(&installer.file_name);
    if name.file_name().and_then(|value| value.to_str()) != Some(installer.file_name.as_str())
        || name.extension().and_then(|value| value.to_str()) != Some("exe")
    {
        return Err("Nome do instalador é inválido".into());
    }
    if installer.sha256.len() != 64
        || !installer
            .sha256
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    {
        return Err("SHA-256 do instalador é inválido".into());
    }
    let url = reqwest::Url::parse(&installer.download_url)
        .map_err(|_| "URL do instalador é inválida".to_string())?;
    let host = url.host_str().ok_or("URL do instalador não possui host")?;
    if url.scheme() != "https"
        || !allowed_hosts
            .iter()
            .any(|allowed| host.eq_ignore_ascii_case(allowed))
    {
        return Err("Instalador está fora dos hosts HTTPS permitidos".into());
    }
    Ok(())
}

fn verify_signature(product_id: &str, release: &Release, public_key: &str) -> Result<(), String> {
    let public_key = STANDARD
        .decode(public_key.trim())
        .map_err(|_| "Chave pública de distribuição é inválida")?;
    let public_key: [u8; 32] = public_key
        .try_into()
        .map_err(|_| "Chave pública de distribuição deve ter 32 bytes")?;
    let key = VerifyingKey::from_bytes(&public_key)
        .map_err(|_| "Chave pública de distribuição é inválida")?;
    let signature = STANDARD
        .decode(&release.signature)
        .map_err(|_| "Assinatura do manifesto é inválida")?;
    let signature =
        Signature::from_slice(&signature).map_err(|_| "Assinatura do manifesto é inválida")?;
    let payload = format!(
        "{}\n{}\n{}\n{}\n{}",
        product_id,
        release.version,
        release.installer.download_url,
        release.installer.size_bytes,
        release.installer.sha256
    );
    key.verify(payload.as_bytes(), &signature)
        .map_err(|_| "Assinatura do manifesto não confere".into())
}

fn plain_semver(value: &str) -> bool {
    let mut parts = value.split('.');
    parts.clone().count() == 3
        && parts.all(|part| !part.is_empty() && part.bytes().all(|byte| byte.is_ascii_digit()))
}

fn installable_product(package_id: &str) -> Result<(&'static str, &'static str), String> {
    match package_id {
        "matriz.uninstall" => Ok(("matriz-uninstall-tauri", "Matriz Uninstall")),
        _ => Err("Produto não possui instalação desktop permitida na Store".into()),
    }
}

fn persist_receipt(root: &Path, receipt: &StoreInstallReceipt) -> Result<(), String> {
    fs::create_dir_all(root)
        .map_err(|error| format!("Não foi possível preparar os recibos da Store: {error}"))?;
    let target = root.join(format!("{}.json", receipt.product_id));
    if target.exists() {
        return Err("Já existe um recibo para este produto; use o fluxo de atualização".into());
    }
    let temporary = root.join(format!(
        ".{}.{}.tmp",
        receipt.product_id,
        uuid::Uuid::new_v4()
    ));
    let bytes = serde_json::to_vec_pretty(receipt)
        .map_err(|error| format!("Não foi possível serializar o recibo: {error}"))?;
    fs::write(&temporary, bytes)
        .and_then(|_| fs::rename(&temporary, &target))
        .map_err(|error| {
            let _ = fs::remove_file(&temporary);
            format!("Não foi possível persistir o recibo da Store: {error}")
        })
}

fn now() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}
