use matriz_desktop_native::system_pulse::SystemPulseService;

#[test]
fn returns_a_lightweight_system_snapshot_without_requiring_temperature() {
    let service = SystemPulseService::new();
    let pulse = service.snapshot(None).expect("system pulse");
    assert!(pulse.total_memory_bytes > 0);
    assert!(pulse.available_memory_bytes <= pulse.total_memory_bytes);
    assert!(!pulse.cpu_model.is_empty());
    assert!(!pulse.windows_version.is_empty());
    assert!(pulse
        .temperature_celsius
        .is_none_or(|value| value > 0.0 && value <= 150.0));
}
