use std::fs;

use matriz_desktop_native::commerce::{CommerceStore, PackageActivationTarget};

#[test]
fn fresh_store_has_no_synthetic_credit_and_local_web_apps_open_without_acquisition() {
    let temp = tempfile::tempdir().expect("temp store");
    let store = CommerceStore::new(temp.path().join("commerce.json"));
    let snapshot = store.snapshot().expect("store snapshot");
    assert_eq!(snapshot.wallet.balance, 0);
    assert!(snapshot.wallet.transactions.is_empty());
    let components = snapshot
        .packages
        .iter()
        .find(|item| item.id == "matriz.components")
        .expect("local web app");
    assert_eq!(components.status, "Installed / Local Runtime");
    assert!(components.installed);
    assert_eq!(
        store.activate(components.id),
        Ok(PackageActivationTarget::Runtime {
            package_id: components.id.into(),
            app_id: "matrizlib".into(),
            operation_id: "app.matrizlib.web".into(),
            route_path: "/".into(),
        })
    );
}

#[test]
fn legacy_wallet_is_imported_as_read_only_history() {
    let temp = tempfile::tempdir().expect("temp store");
    let path = temp.path().join("commerce.json");
    fs::write(&path, r#"{
      "version":1,
      "transactions":[
        {"id":"grant-1","occurredAt":1,"amount":1250,"kind":"grant","title":"Créditos iniciais","packageId":null},
        {"id":"acquire-1","occurredAt":2,"amount":-220,"kind":"acquisition","title":"Matriz Analytics","packageId":"matriz.analytics"}
      ],
      "owned":["matriz.analytics"],"installed":{},"receipts":{}
    }"#).expect("legacy ledger");
    let snapshot = CommerceStore::new(path)
        .snapshot()
        .expect("legacy snapshot");
    assert_eq!(snapshot.wallet.balance, 1_030);
    assert_eq!(snapshot.wallet.transactions.len(), 2);
    assert!(snapshot
        .packages
        .iter()
        .find(|item| item.id == "matriz.analytics")
        .is_some_and(|item| item.installed && item.status == "Installed / Local Runtime"));
}

#[test]
fn commerce_mutations_are_rejected_for_catalog_items() {
    let temp = tempfile::tempdir().expect("temp store");
    let store = CommerceStore::new(temp.path().join("commerce.json"));
    assert!(store.acquire("matriz.analytics").is_err());
    assert!(store.install("matriz.analytics", &[]).is_err());
    assert!(store.repair("matriz.analytics").is_err());
    assert!(store.uninstall("matriz.analytics").is_err());
}

#[test]
fn rejects_tampered_legacy_ledgers() {
    let temp = tempfile::tempdir().expect("temp store");
    let path = temp.path().join("commerce.json");
    fs::write(&path, r#"{
      "version":1,
      "transactions":[
        {"id":"grant-1","occurredAt":1,"amount":1250,"kind":"grant","title":"Créditos iniciais","packageId":null},
        {"id":"grant-2","occurredAt":2,"amount":5000,"kind":"grant","title":"tampered","packageId":null}
      ],
      "owned":[],"installed":{},"receipts":{}
    }"#).expect("tampered state");
    assert!(CommerceStore::new(path).snapshot().is_err());
}

#[test]
fn hub_utilities_are_builtin_and_open_control_without_store_mutation() {
    let temp = tempfile::tempdir().expect("temp store");
    let store = CommerceStore::new(temp.path().join("commerce.json"));
    let snapshot = store.snapshot().expect("snapshot");
    for (package_id, feature_id) in [
        ("matriz.node-sweep", "node-sweep"),
        ("matriz.system-pulse", "system-pulse"),
        ("matriz.awake", "matriz-awake"),
        ("matriz.resume-session", "resume-session"),
    ] {
        let package = snapshot
            .packages
            .iter()
            .find(|item| item.id == package_id)
            .expect("built-in");
        assert!(package.built_in && package.installed);
        assert_eq!(package.status, "Built-in / Enabled");
        assert_eq!(
            store.activate(package_id),
            Ok(PackageActivationTarget::Control {
                package_id: package_id.into(),
                view: "hub".into(),
                feature_id: feature_id.into(),
            })
        );
    }
}

#[test]
fn activation_contract_is_discriminated_and_unknown_products_fail_closed() {
    let target = PackageActivationTarget::Control {
        package_id: "matriz.node-sweep".into(),
        view: "hub".into(),
        feature_id: "node-sweep".into(),
    };
    assert_eq!(
        serde_json::to_value(target).expect("activation JSON"),
        serde_json::json!({
            "kind":"control", "packageId":"matriz.node-sweep", "view":"hub", "featureId":"node-sweep"
        })
    );
    let temp = tempfile::tempdir().expect("temp store");
    assert!(CommerceStore::new(temp.path().join("commerce.json"))
        .activate("../../unknown")
        .is_err());
}

#[test]
fn expanded_catalog_opens_web_apps_but_keeps_unsigned_desktop_products_unavailable() {
    let temp = tempfile::tempdir().expect("temp store");
    let store = CommerceStore::new(temp.path().join("commerce.json"));
    let snapshot = store.snapshot().expect("snapshot");
    for id in [
        "matriz.health",
        "matriz.ops",
        "matriz.pay",
        "matriz.client-admin",
    ] {
        let package = snapshot
            .packages
            .iter()
            .find(|item| item.id == id)
            .expect("web app");
        assert!(package.installed);
        assert!(matches!(
            store.activate(id),
            Ok(PackageActivationTarget::Runtime { .. })
        ));
    }
    let uninstall = snapshot
        .packages
        .iter()
        .find(|item| item.id == "matriz.uninstall")
        .expect("desktop product");
    assert!(!uninstall.installed);
    assert_eq!(uninstall.status, "Available / Signed Release Required");
    assert!(uninstall.installable);
    assert!(store.activate(uninstall.id).is_err());
}
