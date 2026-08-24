use matriz_desktop_native::commerce::CommerceStore;

#[test]
fn wallet_ledger_is_native_authority_and_acquisition_is_idempotently_rejected() {
    let temp = tempfile::tempdir().expect("temp commerce");
    let store = CommerceStore::new(temp.path().join("commerce.json"));
    let initial = store.snapshot().expect("initial snapshot");
    assert_eq!(initial.wallet.balance, 1_250);

    let acquired = store.acquire("matriz.analytics").expect("acquire package");
    assert_eq!(acquired.wallet.balance, 1_030);
    assert!(acquired.packages.iter().any(|package| package.id == "matriz.analytics" && package.owned && !package.installed));
    assert!(store.acquire("matriz.analytics").is_err());
}

#[test]
fn ownership_and_installation_are_separate_persisted_states() {
    let temp = tempfile::tempdir().expect("temp commerce");
    let path = temp.path().join("commerce.json");
    let store = CommerceStore::new(path.clone());
    store.acquire("matriz.analytics").expect("acquire package");
    let installed = store.install("matriz.analytics").expect("install package");
    assert!(installed.packages.iter().any(|package| package.id == "matriz.analytics" && package.owned && package.installed));

    let restored = CommerceStore::new(path).snapshot().expect("restored snapshot");
    assert!(restored.packages.iter().any(|package| package.id == "matriz.analytics" && package.installed));
    let uninstalled = store.uninstall("matriz.analytics").expect("uninstall package");
    assert!(uninstalled.packages.iter().any(|package| package.id == "matriz.analytics" && package.owned && !package.installed));
}

#[test]
fn free_packages_can_be_acquired_without_changing_balance() {
    let temp = tempfile::tempdir().expect("temp commerce");
    let store = CommerceStore::new(temp.path().join("commerce.json"));
    let snapshot = store.acquire("matriz.components").expect("free package");
    assert_eq!(snapshot.wallet.balance, 1_250);
    assert!(snapshot.packages.iter().any(|package| package.id == "matriz.components" && package.owned));
}
