use matriz_desktop_native::terminal::{
    bounded_chunk, bounded_tail, external_process_cwd, normalize_size, validate_session_action,
    TerminalEvent, TerminalLimits, TerminalManager, TerminalSession,
};

#[test]
fn terminal_limits_are_enforced_at_the_native_boundary() {
    assert_eq!(TerminalLimits::default().max_sessions, 6);
    assert_eq!(TerminalLimits::default().max_chunk_bytes, 64 * 1024);
    assert_eq!(TerminalLimits::default().max_tail_bytes, 256 * 1024);
}

#[test]
fn resize_is_normalized_before_reaching_conpty() {
    let minimum = normalize_size(0, 0);
    assert_eq!((minimum.cols, minimum.rows), (2, 1));

    let maximum = normalize_size(9_999, 9_999);
    assert_eq!((maximum.cols, maximum.rows), (400, 200));
}

#[test]
fn only_backend_known_session_ids_are_actionable() {
    let known = ["server-issued-a", "server-issued-b"];
    assert!(validate_session_action("server-issued-a", &known).is_ok());
    assert_eq!(
        validate_session_action("renderer-invented", &known),
        Err("Unknown terminal session".to_owned())
    );
}

#[test]
fn terminal_transport_and_history_are_bounded_on_utf8_boundaries() {
    let oversized = "á".repeat(200_000);
    let chunk = bounded_chunk(&oversized, 64 * 1024);
    let tail = bounded_tail(&oversized, 256 * 1024);

    assert!(chunk.len() <= 64 * 1024);
    assert!(tail.len() <= 256 * 1024);
    assert!(chunk.is_char_boundary(chunk.len()));
    assert!(tail.is_char_boundary(0));
    assert!(oversized.ends_with(&tail));
}

#[test]
fn state_events_expose_the_session_directly_as_camel_case_data() {
    let event = TerminalEvent::State(TerminalSession {
        id: "term-1".into(),
        title: "PowerShell".into(),
        kind: "shell",
        operation_id: None,
        status: "running",
        cwd: "C:\\workspace".into(),
        exit_code: None,
        tail: String::new(),
        process_id: Some(42),
    });

    let json = serde_json::to_value(event).expect("serialized event");
    assert_eq!(json["event"], "state");
    assert_eq!(json["data"]["id"], "term-1");
    assert_eq!(json["data"]["exitCode"], serde_json::Value::Null);
    assert!(json["data"].get("session").is_none());
}

#[cfg(windows)]
#[test]
fn canonical_workspace_paths_are_made_compatible_with_legacy_child_processes() {
    assert_eq!(
        external_process_cwd(std::path::Path::new(r"\\?\C:\Apps\matriz-infra-hub")),
        std::path::PathBuf::from(r"C:\Apps\matriz-infra-hub")
    );
    assert_eq!(
        external_process_cwd(std::path::Path::new(r"C:\Apps\matriz-infra-hub")),
        std::path::PathBuf::from(r"C:\Apps\matriz-infra-hub")
    );
}

#[test]
fn closed_events_identify_the_backend_removed_session() {
    let json = serde_json::to_value(TerminalEvent::Closed {
        session_id: "managed-1".into(),
    })
    .expect("serialized closed event");
    assert_eq!(json["event"], "closed");
    assert_eq!(json["data"]["sessionId"], "managed-1");
}

#[cfg(windows)]
#[test]
fn a_real_shell_can_be_closed_without_blocking_the_ipc_thread() {
    use std::{sync::mpsc, time::Duration};

    let manager = TerminalManager::default();
    let session = manager
        .create_shell(std::path::Path::new(env!("CARGO_MANIFEST_DIR")))
        .expect("PowerShell session");
    let (sent, received) = mpsc::channel();
    std::thread::spawn(move || sent.send(manager.close(&session.id)).expect("close result"));

    assert_eq!(
        received.recv_timeout(Duration::from_secs(5)),
        Ok(Ok(())),
        "closing the PTY blocked"
    );
}

#[cfg(windows)]
#[test]
fn a_real_shell_streams_written_output_into_its_bounded_tail() {
    use std::{
        thread,
        time::{Duration, Instant},
    };

    let manager = TerminalManager::default();
    let session = manager
        .create_shell(std::path::Path::new(env!("CARGO_MANIFEST_DIR")))
        .expect("PowerShell session");
    manager
        .write(&session.id, "Write-Output 'NATIVE_STREAM_OK'\r")
        .expect("terminal input");

    let deadline = Instant::now() + Duration::from_secs(5);
    let streamed = loop {
        let tail = manager
            .list()
            .expect("terminal list")
            .into_iter()
            .find(|item| item.id == session.id)
            .expect("known session")
            .tail;
        if tail.contains("NATIVE_STREAM_OK") {
            break true;
        }
        if Instant::now() >= deadline {
            break false;
        }
        thread::sleep(Duration::from_millis(25));
    };

    manager.close(&session.id).expect("close session");
    assert!(streamed, "PowerShell output never reached the backend tail");
}
