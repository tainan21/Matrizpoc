use matriz_desktop_native::terminal::TerminalSession;
use matriz_desktop_native::{
    catalog_apps, ensure_preview_ready, preview_navigation_allowed, runtime_snapshot, runtime_url,
    ObservedProcess,
};

fn listener(port: u16, pid: u32) -> ObservedProcess {
    ObservedProcess {
        pid,
        port,
        process_name: "node.exe".into(),
        executable_path: None,
        state: "ready",
    }
}

#[test]
fn preview_requires_a_live_catalog_listener() {
    assert!(ensure_preview_ready("matriz-admin", &[listener(3002, 202)]).is_ok());
    assert!(ensure_preview_ready("matriz-admin", &[listener(3001, 101)]).is_err());
    assert!(ensure_preview_ready("unknown", &[]).is_err());
}

#[test]
fn runtime_urls_are_loopback_only_and_reject_ambiguous_paths() {
    assert_eq!(
        runtime_url("matriz-admin", "/settings?tab=agents").unwrap(),
        "http://localhost:3002/settings?tab=agents"
    );
    for path in [
        "settings",
        "//evil.test",
        "/https://evil.test",
        "/a\\b",
        "/a/../secret",
        "/a\nsecret",
    ] {
        assert!(
            runtime_url("matriz-admin", path).is_err(),
            "accepted {path:?}"
        );
    }
    assert!(runtime_url("unknown", "/").is_err());
    assert!(runtime_url("matriz-admin", &format!("/{}", "a".repeat(2049))).is_err());
}

#[test]
fn preview_navigation_stays_on_the_selected_catalog_origin() {
    assert!(preview_navigation_allowed(
        "matriz-admin",
        "http://localhost:3002/settings"
    ));
    for url in [
        "https://localhost:3002/",
        "http://localhost:3001/",
        "http://127.0.0.1:3002/",
        "http://user@localhost:3002/",
        "http://evil.test:3002/",
    ] {
        assert!(
            !preview_navigation_allowed("matriz-admin", url),
            "accepted {url}"
        );
    }
}

fn managed(app_id: &str, status: &'static str) -> TerminalSession {
    TerminalSession {
        id: format!("session-{app_id}"),
        title: app_id.into(),
        kind: "managed",
        operation_id: Some(format!("app.{app_id}.web")),
        status,
        cwd: "C:\\Apps\\matriz-infra-hub".into(),
        exit_code: None,
        tail: String::new(),
        process_id: Some(if app_id == "matriz-hub" { 101 } else { 303 }),
    }
}

#[test]
fn snapshot_distinguishes_managed_external_starting_and_stopped_runtimes() {
    let runtimes = runtime_snapshot(
        &[listener(3000, 101), listener(3002, 202)],
        &[
            managed("matriz-hub", "running"),
            managed("spot", "running"),
            managed("contracts", "failed"),
        ],
    );

    let hub = runtimes
        .iter()
        .find(|runtime| runtime.id == "matriz-hub")
        .unwrap();
    assert_eq!(
        (hub.status, hub.ownership, hub.pid),
        ("ready", "managed", Some(101))
    );
    assert_eq!(hub.endpoint, "http://localhost:3000/");

    let admin = runtimes
        .iter()
        .find(|runtime| runtime.id == "matriz-admin")
        .unwrap();
    assert_eq!(
        (admin.status, admin.ownership, admin.pid),
        ("ready", "external", Some(202))
    );

    let spot = runtimes
        .iter()
        .find(|runtime| runtime.id == "spot")
        .unwrap();
    assert_eq!((spot.status, spot.ownership), ("starting", "managed"));

    let contracts = runtimes
        .iter()
        .find(|runtime| runtime.id == "contracts")
        .unwrap();
    assert_eq!(
        (contracts.status, contracts.ownership),
        ("degraded", "managed")
    );

    let sites = runtimes
        .iter()
        .find(|runtime| runtime.id == "sites")
        .unwrap();
    assert_eq!((sites.status, sites.ownership), ("stopped", "none"));
    assert_eq!(runtimes.len(), catalog_apps().len());
}
