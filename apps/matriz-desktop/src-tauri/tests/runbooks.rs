use matriz_desktop_native::runbooks::{begin, catalog, definition};

#[test]
fn catalog_is_fixed_and_renderer_cannot_define_steps() {
    let runbooks = catalog();
    assert_eq!(
        runbooks.iter().map(|item| item.id).collect::<Vec<_>>(),
        vec!["validate-environment", "recover-open", "apply-visualize",]
    );
    assert_eq!(
        definition("validate-environment")
            .expect("definition")
            .steps,
        &["environment.validate", "doctor.run"]
    );
    assert_eq!(
        definition("recover-open").expect("definition").steps,
        &["runtime.recover", "runtime.open"]
    );
    assert_eq!(
        definition("apply-visualize").expect("definition").steps,
        &["environment.validate", "runtime.recover", "preview.offer"]
    );
    assert!(definition("renderer-defined").is_err());
}

#[test]
fn serializes_runbooks_per_app_without_blocking_other_apps() {
    let first = begin("matriz-admin").expect("first runbook");
    assert!(begin("matriz-admin").is_err());
    let other = begin("spot").expect("independent app runbook");
    drop(first);
    assert!(begin("matriz-admin").is_ok());
    drop(other);
}
