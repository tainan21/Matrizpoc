use std::fs;

use matriz_desktop_native::{app_definition, gate_definition, quick_target, validate_workspace};

#[test]
fn execution_catalog_accepts_only_known_identifiers() {
    assert_eq!(app_definition("matrizlib").expect("known app").port, 3007);
    assert_eq!(
        gate_definition("test:smoke").expect("known gate").script,
        "test:smoke"
    );
    assert!(quick_target("workspace").is_ok());
    assert!(app_definition("../../malicious").is_err());
    assert!(gate_definition("lint && whoami").is_err());
    assert!(quick_target("https://example.com").is_err());
}

#[test]
fn workspace_requires_both_monorepo_markers() {
    let directory = tempfile::tempdir().expect("temporary workspace");
    fs::write(directory.path().join("package.json"), "{}").expect("package marker");
    assert!(validate_workspace(directory.path()).is_err());

    fs::write(directory.path().join("pnpm-workspace.yaml"), "packages: []")
        .expect("workspace marker");
    assert_eq!(
        validate_workspace(directory.path()).expect("valid workspace"),
        directory.path().canonicalize().expect("canonical fixture")
    );
}
