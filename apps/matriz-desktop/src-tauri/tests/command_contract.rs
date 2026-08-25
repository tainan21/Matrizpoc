use matriz_desktop_native::command_contract::COMMAND_NAMES;

#[test]
fn native_inventory_has_one_entry_for_every_renderer_command() {
    assert_eq!(COMMAND_NAMES.len(), 63);
    let mut unique = COMMAND_NAMES.to_vec();
    unique.sort_unstable();
    unique.dedup();
    assert_eq!(unique.len(), COMMAND_NAMES.len());
}

#[test]
fn native_inventory_exposes_no_generic_authority() {
    const FORBIDDEN: [&str; 7] = [
        "exec",
        "shell",
        "read_file",
        "write_file",
        "kill_by_name",
        "open_url",
        "run_command",
    ];

    assert!(FORBIDDEN
        .iter()
        .all(|forbidden| !COMMAND_NAMES.contains(forbidden)));
}

#[test]
fn native_inventory_keeps_sensitive_operations_explicit() {
    assert!(COMMAND_NAMES.contains(&"terminate_process"));
    assert!(COMMAND_NAMES.contains(&"start_managed_operation"));
    assert!(COMMAND_NAMES.contains(&"write_terminal"));
    assert!(COMMAND_NAMES.contains(&"install_native_app"));
    assert!(COMMAND_NAMES.contains(&"stop_native_app"));
    assert!(COMMAND_NAMES.contains(&"reveal_environment_value"));
    assert!(COMMAND_NAMES.contains(&"save_environment"));
    assert!(COMMAND_NAMES.contains(&"recycle_resource"));
    assert!(COMMAND_NAMES.contains(&"acquire_package"));
    assert!(COMMAND_NAMES.contains(&"install_package"));
    assert!(COMMAND_NAMES.contains(&"compare_environments"));
    assert!(COMMAND_NAMES.contains(&"find_environment_references"));
    assert!(COMMAND_NAMES.contains(&"repair_package"));
    assert!(COMMAND_NAMES.contains(&"recover_runtime"));
    assert!(COMMAND_NAMES.contains(&"run_runbook"));
}
