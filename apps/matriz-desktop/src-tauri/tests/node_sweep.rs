use std::{
    fs,
    time::{Duration, SystemTime},
};

use matriz_desktop_native::{
    hub_state::HubStateStore,
    node_sweep::{is_stale_at, NodeSweepService, STALE_AFTER},
};

fn workspace() -> tempfile::TempDir {
    let root = tempfile::tempdir().expect("workspace fixture");
    fs::write(root.path().join("package.json"), "{}").expect("package marker");
    fs::write(root.path().join("pnpm-workspace.yaml"), "packages: []").expect("workspace marker");
    for app in ["matriz-hub", "spot"] {
        let app_root = root.path().join("apps").join(app);
        fs::create_dir_all(app_root.join("node_modules/pkg")).expect("node modules");
        fs::write(
            app_root.join("package.json"),
            "{\"packageManager\":\"pnpm@10\"}",
        )
        .expect("app package");
        fs::write(app_root.join("node_modules/pkg/index.js"), "content").expect("module file");
    }
    fs::create_dir_all(root.path().join("apps/not-registered/node_modules/pkg"))
        .expect("unknown modules");
    root
}

#[test]
fn scan_only_returns_catalog_apps_older_than_five_days() {
    let root = workspace();
    let state = HubStateStore::at(root.path().join("hub-state.json"));
    let old = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .expect("clock")
        .as_millis()
        - (STALE_AFTER + Duration::from_secs(60)).as_millis();
    state
        .set_last_used_for_test(root.path(), "matriz-hub", old)
        .expect("old activity");
    state
        .mark_used(root.path(), "spot")
        .expect("fresh activity");
    let service = NodeSweepService::default();

    let scan = service.scan(root.path(), &state).expect("scan");

    assert_eq!(scan.candidates.len(), 1);
    assert_eq!(scan.candidates[0].app_id, "matriz-hub");
    assert_eq!(scan.candidates[0].package_manager.as_deref(), Some("pnpm"));
    assert!(scan.candidates[0].size_bytes > 0);
    assert!(!scan
        .candidates
        .iter()
        .any(|item| item.app_id == "not-registered"));
}

#[test]
fn five_complete_days_is_the_exact_boundary() {
    let boundary = STALE_AFTER.as_millis();
    assert!(!is_stale_at(boundary, 1));
    assert!(is_stale_at(boundary + 1, 1));
}

#[test]
fn deletion_requires_current_scan_and_never_accepts_paths() {
    let root = workspace();
    let state = HubStateStore::at(root.path().join("hub-state.json"));
    let old = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .expect("clock")
        .as_millis()
        - (STALE_AFTER + Duration::from_secs(60)).as_millis();
    state
        .set_last_used_for_test(root.path(), "matriz-hub", old)
        .expect("old activity");
    let service = NodeSweepService::default();
    let scan = service.scan(root.path(), &state).expect("scan");

    assert!(service
        .delete(root.path(), &state, "stale", &["matriz-hub".into()])
        .is_err());
    let result = service
        .delete(root.path(), &state, &scan.scan_id, &["matriz-hub".into()])
        .expect("delete");
    assert!(result.results[0].deleted);
    assert!(!root.path().join("apps/matriz-hub/node_modules").exists());
    assert!(root.path().join("apps/spot/node_modules").exists());
}

#[cfg(windows)]
#[test]
fn deletion_unlinks_child_symlinks_without_touching_their_targets() {
    use std::os::windows::fs::symlink_file;
    let root = workspace();
    let external_root = tempfile::tempdir().expect("external fixture root");
    let external = external_root.path().join("preserved.txt");
    fs::write(&external, "preserve").expect("external fixture");
    let link = root
        .path()
        .join("apps/matriz-hub/node_modules/external-link.txt");
    if symlink_file(&external, &link).is_err() {
        let _ = fs::remove_file(&external);
        return;
    }
    let state = HubStateStore::at(root.path().join("hub-state.json"));
    let old = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .expect("clock")
        .as_millis()
        - (STALE_AFTER + Duration::from_secs(60)).as_millis();
    state
        .set_last_used_for_test(root.path(), "matriz-hub", old)
        .expect("old activity");
    let service = NodeSweepService::default();
    let scan = service.scan(root.path(), &state).expect("scan");
    let result = service
        .delete(root.path(), &state, &scan.scan_id, &["matriz-hub".into()])
        .expect("delete");
    assert!(result.results[0].deleted);
    assert_eq!(
        fs::read_to_string(&external).expect("external preserved"),
        "preserve"
    );
}
