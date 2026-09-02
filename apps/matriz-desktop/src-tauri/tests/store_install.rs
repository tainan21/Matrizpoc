use std::{collections::HashMap, sync::Mutex};

use base64::{engine::general_purpose::STANDARD, Engine};
use ed25519_dalek::{Signer, SigningKey};
use matriz_desktop_native::store_release::{StoreInstallHost, StoreInstallManager};
use sha2::{Digest, Sha256};

#[derive(Default)]
struct FakeHost {
    catalogs: Mutex<Vec<Vec<u8>>>,
    artifacts: Mutex<HashMap<String, Vec<u8>>>,
    installed: Mutex<Vec<String>>,
}

impl StoreInstallHost for FakeHost {
    fn catalog(&self) -> Result<Vec<u8>, String> {
        let mut catalogs = self.catalogs.lock().unwrap();
        if catalogs.len() > 1 {
            Ok(catalogs.remove(0))
        } else {
            Ok(catalogs.first().cloned().unwrap_or_default())
        }
    }

    fn download(&self, url: &str, _limit: u64) -> Result<Vec<u8>, String> {
        self.artifacts
            .lock()
            .unwrap()
            .get(url)
            .cloned()
            .ok_or("fixture artifact missing".into())
    }

    fn install(&self, path: &std::path::Path, publisher: &str) -> Result<(), String> {
        assert_eq!(publisher, "Matriz");
        self.installed
            .lock()
            .unwrap()
            .push(path.file_name().unwrap().to_string_lossy().into_owned());
        Ok(())
    }
}

fn signed_catalog(bytes: &[u8], release_id: &str) -> (Vec<u8>, String, String) {
    let signing_key = SigningKey::from_bytes(&[9_u8; 32]);
    let url = "https://releases.matriz.example/matriz-uninstall.exe";
    let sha256 = format!("{:x}", Sha256::digest(bytes));
    let payload = format!(
        "matriz-uninstall-tauri\n0.2.0\n{url}\n{}\n{sha256}",
        bytes.len()
    );
    let signature = STANDARD.encode(signing_key.sign(payload.as_bytes()).to_bytes());
    let public_key = STANDARD.encode(signing_key.verifying_key().to_bytes());
    let catalog = serde_json::json!({
        "schemaVersion":"v1", "generatedAt":"2026-09-02T12:00:00.000Z",
        "products":[{
            "productId":"matriz-uninstall-tauri", "displayName":"Matriz Uninstall",
            "edition":"Tauri", "runtime":"tauri", "platform":"win32", "arch":"x64", "state":"active",
            "windows":{"uninstallKey":"Matriz Uninstall Tauri","displayName":"Matriz Uninstall Tauri","publisher":"Matriz","executableName":"matriz-uninstall-tauri.exe","aliases":[]},
            "release":{"releaseId":release_id,"version":"0.2.0","channel":"stable","releasedAt":"2026-09-02T12:00:00.000Z","releaseNotes":null,
              "installer":{"fileName":"matriz-uninstall-0.2.0-windows-x64-setup.exe","downloadUrl":url,"sizeBytes":bytes.len(),"sha256":sha256},
              "signature":signature,"status":"published","publishedAt":"2026-09-02T12:00:00.000Z"}
        }]
    });
    (catalog.to_string().into_bytes(), public_key, url.into())
}

#[test]
fn installs_only_after_preview_with_a_one_use_token_and_writes_a_receipt() {
    let artifact = b"signed installer".to_vec();
    let release_id = "4a45b2b6-8e66-4c6b-b2f7-54575d706f61";
    let (catalog, public_key, url) = signed_catalog(&artifact, release_id);
    let host = FakeHost::default();
    host.catalogs.lock().unwrap().push(catalog);
    host.artifacts.lock().unwrap().insert(url, artifact);
    let root = tempfile::tempdir().unwrap();
    let manager = StoreInstallManager::with_host(
        root.path().to_path_buf(),
        public_key,
        vec!["releases.matriz.example".into()],
        Box::new(host),
    );

    let preview = manager.preview("matriz.uninstall").expect("preview");
    assert_eq!(preview.product_id, "matriz.uninstall");
    assert_eq!(preview.version, "0.2.0");
    let receipt = manager
        .confirm(&preview.confirmation_token)
        .expect("install");
    assert_eq!(receipt.release_id, release_id);
    assert!(root.path().join("receipts/matriz.uninstall.json").is_file());
    assert!(manager.confirm(&preview.confirmation_token).is_err());
}

#[test]
fn revalidation_blocks_a_release_that_changed_after_preview() {
    let artifact = b"signed installer".to_vec();
    let (first, public_key, _) = signed_catalog(&artifact, "4a45b2b6-8e66-4c6b-b2f7-54575d706f61");
    let (changed, _, _) = signed_catalog(&artifact, "5b56c3c7-9f77-4d7c-c308-65686e817072");
    let host = FakeHost::default();
    host.catalogs.lock().unwrap().extend([first, changed]);
    let root = tempfile::tempdir().unwrap();
    let manager = StoreInstallManager::with_host(
        root.path().to_path_buf(),
        public_key,
        vec!["releases.matriz.example".into()],
        Box::new(host),
    );
    let preview = manager.preview("matriz.uninstall").expect("preview");
    assert!(manager.confirm(&preview.confirmation_token).is_err());
    assert!(!root.path().join("receipts/matriz.uninstall.json").exists());
}
