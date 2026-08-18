use matriz_desktop_native::terminal::{
    bounded_chunk, bounded_tail, normalize_size, validate_session_action, TerminalLimits,
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
