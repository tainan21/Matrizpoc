use matriz_desktop_native::commerce::CommerceStore;
use std::fs;

#[test]
fn wallet_ledger_is_native_authority_and_acquisition_is_idempotently_rejected() {
    let temp = tempfile::tempdir().expect("temp commerce");
    let store = CommerceStore::new(temp.path().join("commerce.json"));
    let initial = store.snapshot().expect("initial snapshot");
    assert_eq!(initial.wallet.balance, 1_250);

    let acquired = store.acquire("matriz.analytics").expect("acquire package");
    assert_eq!(acquired.wallet.balance, 1_030);
    assert!(acquired
        .packages
        .iter()
        .any(|package| package.id == "matriz.analytics" && package.owned && !package.installed));
    assert!(store.acquire("matriz.analytics").is_err());
}

#[test]
fn ownership_and_installation_are_separate_persisted_states() {
    let temp = tempfile::tempdir().expect("temp commerce");
    let path = temp.path().join("commerce.json");
    let store = CommerceStore::new(path.clone());
    store.acquire("matriz.analytics").expect("acquire package");
    let installed = store
        .install("matriz.analytics", &["runtime:observe", "activity:read"])
        .expect("install package");
    assert!(installed
        .packages
        .iter()
        .any(|package| package.id == "matriz.analytics" && package.owned && package.installed));

    let restored = CommerceStore::new(path)
        .snapshot()
        .expect("restored snapshot");
    assert!(restored
        .packages
        .iter()
        .any(|package| package.id == "matriz.analytics" && package.installed));
    let uninstalled = store
        .uninstall("matriz.analytics")
        .expect("uninstall package");
    assert!(uninstalled
        .packages
        .iter()
        .any(|package| package.id == "matriz.analytics" && package.owned && !package.installed));
}

#[test]
fn installation_requires_explicit_exact_permissions_and_writes_a_receipt() {
    let temp = tempfile::tempdir().expect("temp commerce");
    let store = CommerceStore::new(temp.path().join("commerce.json"));
    store.acquire("matriz.analytics").expect("acquire package");

    assert!(store.install("matriz.analytics", &[]).is_err());
    assert!(store
        .install(
            "matriz.analytics",
            &["runtime:observe", "activity:read", "workspace:write"]
        )
        .is_err());

    let installed = store
        .install("matriz.analytics", &["activity:read", "runtime:observe"])
        .expect("consented install");
    let package = installed
        .packages
        .iter()
        .find(|item| item.id == "matriz.analytics")
        .expect("package");
    assert_eq!(package.trust_status, "verified");
    let receipt = package.receipt.as_ref().expect("install receipt");
    assert_eq!(receipt.package_id, "matriz.analytics");
    assert_eq!(
        receipt.granted_permissions,
        vec!["activity:read", "runtime:observe"]
    );
    assert_eq!(receipt.manifest_digest.len(), 64);
}

#[test]
fn repair_reissues_a_verified_receipt_without_changing_ownership() {
    let temp = tempfile::tempdir().expect("temp commerce");
    let store = CommerceStore::new(temp.path().join("commerce.json"));
    store
        .acquire("matriz.components")
        .expect("acquire free package");
    store
        .install("matriz.components", &["runtime:start"])
        .expect("install package");

    let repaired = store.repair("matriz.components").expect("repair package");
    let package = repaired
        .packages
        .iter()
        .find(|item| item.id == "matriz.components")
        .expect("package");
    assert!(package.owned && package.installed);
    assert_eq!(package.trust_status, "verified");
}

#[test]
fn reports_a_changed_receipt_digest_without_trusting_it() {
    let temp = tempfile::tempdir().expect("temp commerce");
    let path = temp.path().join("commerce.json");
    let store = CommerceStore::new(path.clone());
    store.acquire("matriz.components").expect("acquire package");
    store
        .install("matriz.components", &["runtime:start"])
        .expect("install package");
    let mut state: serde_json::Value =
        serde_json::from_slice(&fs::read(&path).expect("state bytes")).expect("state json");
    state["receipts"]["matriz.components"]["manifestDigest"] =
        serde_json::Value::String("0".repeat(64));
    fs::write(
        &path,
        serde_json::to_vec_pretty(&state).expect("changed state"),
    )
    .expect("write changed receipt");

    let changed = CommerceStore::new(path)
        .snapshot()
        .expect("changed snapshot");
    let package = changed
        .packages
        .iter()
        .find(|item| item.id == "matriz.components")
        .expect("package");
    assert_eq!(package.trust_status, "changed");
}

#[test]
fn changed_receipt_metadata_remains_visible_and_repairable() {
    let temp = tempfile::tempdir().expect("temp commerce");
    let path = temp.path().join("commerce.json");
    let store = CommerceStore::new(path.clone());
    store.acquire("matriz.components").expect("acquire package");
    store
        .install("matriz.components", &["runtime:start"])
        .expect("install package");
    let mut state: serde_json::Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
    state["receipts"]["matriz.components"]["version"] = serde_json::Value::String("0.0.1".into());
    state["receipts"]["matriz.components"]["grantedPermissions"] =
        serde_json::json!(["workspace:write"]);
    fs::write(&path, serde_json::to_vec_pretty(&state).unwrap()).unwrap();

    let changed = CommerceStore::new(path.clone())
        .snapshot()
        .expect("changed snapshot");
    assert_eq!(
        changed
            .packages
            .iter()
            .find(|item| item.id == "matriz.components")
            .unwrap()
            .trust_status,
        "changed"
    );
    let repaired = CommerceStore::new(path)
        .repair("matriz.components")
        .expect("repair changed receipt");
    assert_eq!(
        repaired
            .packages
            .iter()
            .find(|item| item.id == "matriz.components")
            .unwrap()
            .trust_status,
        "verified"
    );
}

#[test]
fn free_packages_can_be_acquired_without_changing_balance() {
    let temp = tempfile::tempdir().expect("temp commerce");
    let store = CommerceStore::new(temp.path().join("commerce.json"));
    let snapshot = store.acquire("matriz.components").expect("free package");
    assert_eq!(snapshot.wallet.balance, 1_250);
    assert!(snapshot
        .packages
        .iter()
        .any(|package| package.id == "matriz.components" && package.owned));
}

#[test]
fn rejects_tampered_ledgers_and_installations_without_ownership() {
    let temp = tempfile::tempdir().expect("temp commerce");
    let path = temp.path().join("commerce.json");
    fs::write(&path, r#"{
      "version": 1,
      "transactions": [
        {"id":"grant-1","occurredAt":1,"amount":1250,"kind":"grant","title":"Créditos iniciais","packageId":null},
        {"id":"grant-2","occurredAt":2,"amount":5000,"kind":"grant","title":"tampered","packageId":null}
      ],
      "owned": ["matriz.analytics"],
      "installed": {"matriz.analytics":"1.2.0"}
    }"#).expect("tampered state");
    assert!(CommerceStore::new(path).snapshot().is_err());
}

#[test]
fn rejects_owned_or_installed_packages_without_a_matching_acquisition() {
    let temp = tempfile::tempdir().expect("temp commerce");
    let path = temp.path().join("commerce.json");
    fs::write(&path, r#"{
      "version": 1,
      "transactions": [
        {"id":"grant-1","occurredAt":1,"amount":1250,"kind":"grant","title":"Créditos iniciais","packageId":null}
      ],
      "owned": ["matriz.analytics"],
      "installed": {"matriz.analytics":"1.2.0"}
    }"#).expect("invalid ownership");
    assert!(CommerceStore::new(path).snapshot().is_err());
}
