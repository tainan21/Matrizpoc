use matriz_desktop_native::{listener_pid_for_app, ObservedProcess};

fn listener(pid: u32, port: u16) -> ObservedProcess {
    ObservedProcess {
        pid,
        port,
        process_name: "node.exe".into(),
        executable_path: Some("C:\\Program Files\\nodejs\\node.exe".into()),
        state: "ready",
    }
}

#[test]
fn stopping_a_managed_app_targets_only_its_catalog_port() {
    let listeners = [listener(7001, 3001), listener(7002, 3002)];
    assert_eq!(listener_pid_for_app("matriz-admin", &listeners), Ok(7002));
    assert!(listener_pid_for_app("../../unknown", &listeners).is_err());
    assert!(listener_pid_for_app("contracts", &listeners).is_err());
}

#[test]
fn protected_listener_pids_are_never_returned() {
    assert!(listener_pid_for_app("matriz-admin", &[listener(4, 3002)]).is_err());
}
