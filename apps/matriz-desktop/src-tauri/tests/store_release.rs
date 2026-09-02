use base64::{engine::general_purpose::STANDARD, Engine};
use ed25519_dalek::{Signer, SigningKey};
use matriz_desktop_native::store_release::verify_catalog_release;

fn signed_catalog(download_url: &str, size_bytes: u64, sha256: &str) -> (String, String) {
    let signing_key = SigningKey::from_bytes(&[7_u8; 32]);
    let payload = format!("matriz-uninstall-tauri\n0.2.0\n{download_url}\n{size_bytes}\n{sha256}");
    let signature = STANDARD.encode(signing_key.sign(payload.as_bytes()).to_bytes());
    let public_key = STANDARD.encode(signing_key.verifying_key().to_bytes());
    let catalog = serde_json::json!({
        "schemaVersion": "v1",
        "generatedAt": "2026-09-02T12:00:00.000Z",
        "products": [{
            "productId": "matriz-uninstall-tauri",
            "displayName": "Matriz Uninstall",
            "edition": "Tauri",
            "runtime": "tauri",
            "platform": "win32",
            "arch": "x64",
            "state": "active",
            "windows": {
                "uninstallKey": "Matriz Uninstall Tauri",
                "displayName": "Matriz Uninstall Tauri",
                "publisher": "Matriz",
                "executableName": "matriz-uninstall-tauri.exe",
                "aliases": []
            },
            "release": {
                "releaseId": "4a45b2b6-8e66-4c6b-b2f7-54575d706f61",
                "version": "0.2.0",
                "channel": "stable",
                "releasedAt": "2026-09-02T12:00:00.000Z",
                "releaseNotes": null,
                "installer": {
                    "fileName": "matriz-uninstall-0.2.0-windows-x64-setup.exe",
                    "downloadUrl": download_url,
                    "sizeBytes": size_bytes,
                    "sha256": sha256
                },
                "signature": signature,
                "status": "published",
                "publishedAt": "2026-09-02T12:00:00.000Z"
            }
        }]
    });
    (catalog.to_string(), public_key)
}

#[test]
fn accepts_only_a_published_signed_allowlisted_release() {
    let sha256 = "a".repeat(64);
    let (catalog, public_key) = signed_catalog(
        "https://releases.matriz.example/matriz-uninstall.exe",
        42,
        &sha256,
    );
    let release = verify_catalog_release(
        catalog.as_bytes(),
        "matriz-uninstall-tauri",
        &public_key,
        &["releases.matriz.example"],
    )
    .expect("verified release");
    assert_eq!(release.product_id, "matriz-uninstall-tauri");
    assert_eq!(release.release_id, "4a45b2b6-8e66-4c6b-b2f7-54575d706f61");
    assert_eq!(release.expected_publisher, "Matriz");
}

#[test]
fn rejects_tampering_insecure_or_unapproved_release_hosts() {
    let sha256 = "a".repeat(64);
    let (catalog, public_key) = signed_catalog(
        "https://releases.matriz.example/matriz-uninstall.exe",
        42,
        &sha256,
    );
    let tampered = catalog.replace(&sha256, &"b".repeat(64));
    assert!(verify_catalog_release(
        tampered.as_bytes(),
        "matriz-uninstall-tauri",
        &public_key,
        &["releases.matriz.example"],
    )
    .is_err());

    let (insecure, public_key) = signed_catalog(
        "http://releases.matriz.example/matriz-uninstall.exe",
        42,
        &sha256,
    );
    assert!(verify_catalog_release(
        insecure.as_bytes(),
        "matriz-uninstall-tauri",
        &public_key,
        &["releases.matriz.example"],
    )
    .is_err());

    let (foreign, public_key) = signed_catalog(
        "https://downloads.example.net/matriz-uninstall.exe",
        42,
        &sha256,
    );
    assert!(verify_catalog_release(
        foreign.as_bytes(),
        "matriz-uninstall-tauri",
        &public_key,
        &["releases.matriz.example"],
    )
    .is_err());
}
