use matriz_desktop_native::activity::ActivityHub;

#[test]
fn activity_history_is_ordered_bounded_and_summary_safe() {
    let hub = ActivityHub::default();
    for index in 0..205 {
        hub.publish(
            "runtime.started",
            "success",
            &format!("Runtime {index}"),
            Some(&"x".repeat(500)),
            None,
        );
    }
    let history = hub.history().unwrap();
    assert_eq!(history.len(), 200);
    assert_eq!(history.first().unwrap().title, "Runtime 5");
    assert_eq!(history.last().unwrap().title, "Runtime 204");
    assert!(history
        .iter()
        .all(|event| event.detail.as_deref().unwrap_or("").len() <= 240));
    let serialized = serde_json::to_string(&history).unwrap();
    assert!(!serialized.contains("terminalOutput"));
}
