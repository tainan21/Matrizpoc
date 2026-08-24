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
    let installed = store.install("matriz.analytics").expect("install package");
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
