use std::{
    fs,
    sync::{Arc, Barrier},
    thread,
};

use matriz_desktop_native::{
    environment::{EnvironmentPromotionRequest, EnvironmentSaveRequest, EnvironmentService, EnvironmentVariableInput},
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
    fs::write(app.join(".env.staging"), "PUBLIC_URL=https://staging.matriz.local\nJWT_SECRET=staging-secret\n").unwrap();
    let resources = WorkspaceResourceService::new(root.path().to_path_buf()).unwrap();
    (root, EnvironmentService::new(resources))
}

#[test]
fn compares_and_promotes_secrets_without_exposing_their_values() {
    let (_root, service) = fixture("PUBLIC_URL=http://localhost:3002\nJWT_SECRET=source-secret\n");
    let comparison = service
        .compare("matriz-admin", ".env.local", ".env.staging")
        .expect("compare environments");
    let secret = comparison
        .entries
        .iter()
        .find(|entry| entry.key == "JWT_SECRET")
        .expect("secret entry");
    assert_eq!(secret.status, "different");
    assert!(secret.sensitive);
    assert_eq!(secret.source_value, None);
    assert_eq!(secret.target_value, None);

    let promoted = service
        .promote(EnvironmentPromotionRequest {
            app_id: "matriz-admin".into(),
            source_file: ".env.local".into(),
            target_file: ".env.staging".into(),
            target_revision: comparison.target_revision,
            keys: vec!["JWT_SECRET".into()],
        })
        .expect("promote secret");
    assert_eq!(promoted.file_name, ".env.staging");
    assert_eq!(
        service
            .reveal("matriz-admin", ".env.staging", "JWT_SECRET")
            .expect("reveal promoted secret"),
        "source-secret"
    );
}

#[test]
fn promotion_rejects_stale_same_file_and_unknown_keys() {
    let (_root, service) = fixture("PUBLIC_URL=http://localhost:3002\n");
    for request in [
        EnvironmentPromotionRequest { app_id: "matriz-admin".into(), source_file: ".env.local".into(), target_file: ".env.staging".into(), target_revision: "stale".into(), keys: vec!["PUBLIC_URL".into()] },
        EnvironmentPromotionRequest { app_id: "matriz-admin".into(), source_file: ".env.local".into(), target_file: ".env.local".into(), target_revision: service.read("matriz-admin", ".env.local").unwrap().revision, keys: vec!["PUBLIC_URL".into()] },
        EnvironmentPromotionRequest { app_id: "matriz-admin".into(), source_file: ".env.local".into(), target_file: ".env.staging".into(), target_revision: service.read("matriz-admin", ".env.staging").unwrap().revision, keys: vec!["UNKNOWN_KEY".into()] },
    ] {
        assert!(service.promote(request).is_err());
    }
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

#[test]
fn concurrent_saves_never_both_commit_the_same_revision() {
    let (root, service) = fixture("PUBLIC_URL=old\n");
    let revision = service.read("matriz-admin", ".env.local").unwrap().revision;
    let barrier = Arc::new(Barrier::new(2));
    let mut handles = Vec::new();
    for value in ["first", "second"] {
        let root_path = root.path().to_path_buf();
        let revision = revision.clone();
        let barrier = barrier.clone();
        handles.push(thread::spawn(move || {
            let resources = WorkspaceResourceService::new(root_path).unwrap();
            let service = EnvironmentService::new(resources);
            barrier.wait();
            service.save(EnvironmentSaveRequest {
                app_id: "matriz-admin".into(),
                file_name: ".env.local".into(),
                revision,
                variables: vec![EnvironmentVariableInput {
                    key: "PUBLIC_URL".into(),
                    value: Some(value.into()),
                }],
            })
        }));
    }
    let results = handles
        .into_iter()
        .map(|handle| handle.join().unwrap())
        .collect::<Vec<_>>();
    assert_eq!(results.iter().filter(|result| result.is_ok()).count(), 1);
    assert_eq!(results.iter().filter(|result| result.is_err()).count(), 1);
}
