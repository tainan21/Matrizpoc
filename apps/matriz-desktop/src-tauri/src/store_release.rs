use std::path::Path;

use base64::{engine::general_purpose::STANDARD, Engine};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};

const MAX_INSTALLER_BYTES: u64 = 536_870_912;

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
