use matriz_desktop_native::{authorize_termination, ObservedProcess, TerminationError};

fn observed(pid: u32) -> ObservedProcess {
    ObservedProcess {
        pid,
        port: 3000,
        process_name: "node.exe".into(),
        executable_path: None,
        state: "external",
    }
}

#[test]
fn rejects_protected_and_unobserved_processes() {
    let current = std::process::id();
    let snapshot = vec![observed(4010), observed(current)];

    assert_eq!(
        authorize_termination(0, "fresh", "fresh", &snapshot, current),
        Err(TerminationError::ProtectedProcess)
    );
    assert_eq!(
        authorize_termination(4, "fresh", "fresh", &snapshot, current),
        Err(TerminationError::ProtectedProcess)
    );
    assert_eq!(
        authorize_termination(current, "fresh", "fresh", &snapshot, current),
        Err(TerminationError::ProtectedProcess)
    );
    assert_eq!(
        authorize_termination(9999, "fresh", "fresh", &snapshot, current),
        Err(TerminationError::NotObserved)
    );
}

#[test]
fn rejects_stale_snapshots_and_accepts_exact_observation() {
    let snapshot = vec![observed(4010)];

    assert_eq!(
        authorize_termination(4010, "stale", "fresh", &snapshot, 9020),
        Err(TerminationError::StaleSnapshot)
    );
    assert_eq!(
        authorize_termination(4010, "fresh", "fresh", &snapshot, 9020),
        Ok(())
    );
}

#[test]
fn duplicate_batch_pids_are_rejected() {
    let snapshot = vec![observed(4010)];
    assert_eq!(
        matriz_desktop_native::authorize_batch(&[4010, 4010], "fresh", "fresh", &snapshot, 9020),
        Err(TerminationError::DuplicateProcess)
    );
}
