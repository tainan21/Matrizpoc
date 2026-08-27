use std::fs;

use matriz_desktop_native::resources::WorkspaceResourceService;

fn fixture() -> (tempfile::TempDir, WorkspaceResourceService) {
    let root = tempfile::tempdir().unwrap();
    fs::create_dir_all(root.path().join("apps/matriz-admin/src")).unwrap();
    fs::write(root.path().join("package.json"), "{}").unwrap();
    fs::write(root.path().join("pnpm-workspace.yaml"), "packages: []").unwrap();
    let service = WorkspaceResourceService::new(root.path().to_path_buf()).unwrap();
    (root, service)
}

#[test]
fn resolves_only_catalog_apps_inside_the_workspace() {
    let (_root, service) = fixture();
    assert!(service.existing_path("matriz-admin", "src").is_ok());
    assert!(service.existing_path("unknown", "src").is_err());
    assert!(service.existing_path("matriz-admin", "../spot").is_err());
    assert!(service
        .existing_path("matriz-admin", "C:\\Windows")
        .is_err());
}

#[test]
fn new_children_require_a_safe_single_name_and_existing_parent() {
    let (_root, service) = fixture();
    assert!(service
        .new_child_path("matriz-admin", "src", "copy.ts")
        .is_ok());
    assert!(service
        .new_child_path("matriz-admin", "src", "../copy.ts")
        .is_err());
    assert!(service
        .new_child_path("matriz-admin", "missing", "copy.ts")
        .is_err());
    for unsafe_name in ["CON", "nul.txt", "file.ts:secret", "bad?.ts", "trail. "] {
        assert!(
            service
                .new_child_path("matriz-admin", "src", unsafe_name)
                .is_err(),
            "{unsafe_name} must be rejected on Windows"
        );
    }
}
