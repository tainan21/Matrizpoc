use matriz_desktop_native::runbooks::{catalog, definition};

#[test]
fn catalog_is_fixed_and_renderer_cannot_define_steps() {
    let runbooks = catalog();
    assert_eq!(runbooks.iter().map(|item| item.id).collect::<Vec<_>>(), vec![
        "validate-environment",
        "recover-open",
        "apply-visualize",
    ]);
    assert_eq!(definition("validate-environment").expect("definition").steps, &["environment.validate", "doctor.run"]);
    assert_eq!(definition("recover-open").expect("definition").steps, &["runtime.recover", "runtime.open"]);
    assert_eq!(definition("apply-visualize").expect("definition").steps, &["environment.validate", "runtime.recover", "preview.offer"]);
    assert!(definition("renderer-defined").is_err());
}
