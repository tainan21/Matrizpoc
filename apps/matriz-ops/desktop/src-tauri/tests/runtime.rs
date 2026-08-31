use matriz_ops_desktop_native::{
    probe_health_endpoint, ConnectionError, RuntimeTargets, RuntimeValidationError,
};
use std::{
    io::{Read, Write},
    net::TcpListener,
    thread,
    time::Duration,
};

#[test]
fn release_targets_require_exact_https_origins() {
    let targets = RuntimeTargets::release(
        "https://ops.matriz.example",
        "https://identity.matriz.example",
    )
    .expect("valid release origins");

    assert_eq!(targets.ops_origin(), "https://ops.matriz.example");
    assert_eq!(
        targets.health_url(),
        "https://ops.matriz.example/api/health"
    );
    assert_eq!(targets.identity_origin(), "https://identity.matriz.example");
}

#[test]
fn release_targets_reject_missing_or_ambiguous_values() {
    for candidate in [
        "",
        "http://ops.matriz.example",
        "https://user:secret@ops.matriz.example",
        "https://ops.matriz.example/path",
        "https://ops.matriz.example?preview=true",
        "https://ops.matriz.example/#fragment",
    ] {
        assert!(
            RuntimeTargets::release(candidate, "https://identity.matriz.example").is_err(),
            "accepted invalid Ops origin {candidate:?}"
        );
    }

    assert_eq!(
        RuntimeTargets::release("https://ops.matriz.example", ""),
        Err(RuntimeValidationError::MissingIdentityOrigin)
    );
}

#[test]
fn navigation_is_limited_to_launcher_ops_and_identity() {
    let targets = RuntimeTargets::release(
        "https://ops.matriz.example",
        "https://identity.matriz.example",
    )
    .unwrap();

    for allowed in [
        "tauri://localhost/",
        "http://tauri.localhost/",
        "https://ops.matriz.example/users",
        "https://identity.matriz.example/auth?client_id=ops",
    ] {
        assert!(targets.allows_navigation(allowed), "blocked {allowed}");
    }

    for denied in [
        "http://127.0.0.1:3011/",
        "https://ops.matriz.example.evil.test/",
        "https://user@ops.matriz.example/",
        "https://example.com/",
        "file:///C:/Windows/System32/config/SAM",
    ] {
        assert!(!targets.allows_navigation(denied), "allowed {denied}");
    }
}

#[test]
fn development_targets_allow_only_the_declared_loopback_runtime() {
    let targets = RuntimeTargets::development();

    assert!(targets.allows_navigation("http://127.0.0.1:3011/"));
    assert!(!targets.allows_navigation("http://localhost:3011/"));
    assert!(!targets.allows_navigation("http://127.0.0.1:3009/"));
}

#[test]
fn health_probe_accepts_only_successful_http_statuses() {
    let success = fixture_server("204 No Content", Duration::ZERO);
    tauri::async_runtime::block_on(probe_health_endpoint(&success, Duration::from_secs(1)))
        .expect("successful health response");

    let unavailable = fixture_server("503 Service Unavailable", Duration::ZERO);
    assert_eq!(
        tauri::async_runtime::block_on(
            probe_health_endpoint(&unavailable, Duration::from_secs(1),)
        ),
        Err(ConnectionError::Unavailable)
    );
}

#[test]
fn health_probe_sanitizes_timeouts() {
    let slow = fixture_server("200 OK", Duration::from_millis(200));
    assert_eq!(
        tauri::async_runtime::block_on(probe_health_endpoint(&slow, Duration::from_millis(20),)),
        Err(ConnectionError::Unavailable)
    );
}

fn fixture_server(status: &'static str, delay: Duration) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let address = listener.local_addr().unwrap();
    thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        let mut request = [0_u8; 1024];
        let _ = stream.read(&mut request);
        thread::sleep(delay);
        let response =
            format!("HTTP/1.1 {status}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
        let _ = stream.write_all(response.as_bytes());
    });
    format!("http://{address}/api/health")
}
