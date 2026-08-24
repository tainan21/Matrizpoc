use std::fs;

use matriz_desktop_native::{
    environment::{EnvironmentSaveRequest, EnvironmentService, EnvironmentVariableInput},
    resources::WorkspaceResourceService,
};

fn fixture(contents: &str) -> (tempfile::TempDir, EnvironmentService) {
    let root = tempfile::tempdir().unwrap();
    let app = root.path().join("apps/matriz-admin");
    fs::create_dir_all(&app).unwrap();
    fs::write(root.path().join("package.json"), "{}").unwrap();
    fs::write(root.path().join("pnpm-workspace.yaml"), "packages: []").unwrap();
    fs::write(app.join(".env.local"), contents).unwrap();
    fs::write(app.join(".env.example"), "PUBLIC_URL=\nREQUIRED_KEY=\n").unwrap();
    let resources = WorkspaceResourceService::new(root.path().to_path_buf()).unwrap();
    (root, EnvironmentService::new(resources))
}

#[test]
fn reads_public_values_but_masks_and_reveals_one_secret_explicitly() {
    let (_root, service) = fixture(
        "# keep this comment\nPUBLIC_URL=http://localhost:3002\nJWT_SECRET=private-value\n",
    );
    let document = service.read("matriz-admin", ".env.local").unwrap();
    assert_eq!(
        document.variables[0].value.as_deref(),
        Some("http://localhost:3002")
    );
    assert_eq!(document.variables[1].value, None);
    assert!(document.variables[1].sensitive);
    assert_eq!(
        service
            .reveal("matriz-admin", ".env.local", "JWT_SECRET")
            .unwrap(),
        "private-value"
    );
    assert_eq!(document.missing_required, vec!["REQUIRED_KEY"]);
}

#[test]
fn saves_atomically_preserving_comments_and_unrevealed_secrets() {
    let (root, service) = fixture("# keep\nPUBLIC_URL=old\nJWT_SECRET=private-value\n");
    let document = service.read("matriz-admin", ".env.local").unwrap();
    let saved = service
        .save(EnvironmentSaveRequest {
            app_id: "matriz-admin".into(),
            file_name: ".env.local".into(),
            revision: document.revision,
            variables: vec![
                EnvironmentVariableInput {
                    key: "PUBLIC_URL".into(),
                    value: Some("new".into()),
                },
                EnvironmentVariableInput {
                    key: "JWT_SECRET".into(),
                    value: None,
                },
                EnvironmentVariableInput {
                    key: "REQUIRED_KEY".into(),
                    value: Some("ready".into()),
                },
            ],
        })
        .unwrap();
    assert!(saved.missing_required.is_empty());
    let contents = fs::read_to_string(root.path().join("apps/matriz-admin/.env.local")).unwrap();
    assert!(contents.starts_with("# keep\n"));
    assert!(contents.contains("PUBLIC_URL=new"));
    assert!(contents.contains("JWT_SECRET=private-value"));
    assert!(contents.contains("REQUIRED_KEY=ready"));
}

#[test]
fn refuses_stale_revisions_invalid_keys_and_unsupported_files() {
    let (_root, service) = fixture("PUBLIC_URL=old\n");
    let request = EnvironmentSaveRequest {
        app_id: "matriz-admin".into(),
        file_name: ".env.local".into(),
        revision: "stale".into(),
        variables: vec![EnvironmentVariableInput {
            key: "BAD-KEY".into(),
            value: Some("x".into()),
        }],
    };
    assert!(service.save(request).is_err());
    assert!(service.read("matriz-admin", ".env.secret").is_err());
}
