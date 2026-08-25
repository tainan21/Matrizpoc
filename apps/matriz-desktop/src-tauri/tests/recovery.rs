use matriz_desktop_native::recovery::{recovery_action, RecoveryAction};

#[test]
fn selects_the_smallest_safe_recovery_action() {
    assert_eq!(recovery_action("stopped", "none"), RecoveryAction::Start);
    assert_eq!(
        recovery_action("degraded", "managed"),
        RecoveryAction::Restart
    );
    assert_eq!(recovery_action("ready", "managed"), RecoveryAction::Restart);
    assert_eq!(
        recovery_action("degraded", "external"),
        RecoveryAction::DiagnoseOnly
    );
}
