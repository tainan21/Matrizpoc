use matriz_desktop_native::resolve_acceptance_config_dir;
use std::fs;

#[test]
fn acceptance_config_override_is_limited_to_an_existing_temporary_directory() {
    let temporary_root = tempfile::tempdir().expect("temp root");
    let isolated = temporary_root.path().join("control-config");
    fs::create_dir_all(&isolated).expect("isolated config");
    let default = temporary_root.path().join("default");

    assert_eq!(
        resolve_acceptance_config_dir(
            &default,
            temporary_root.path(),
            Some("1"),
            isolated.to_str(),
        ),
        isolated.canonicalize().expect("canonical isolated config")
    );

    assert_eq!(
        resolve_acceptance_config_dir(&default, temporary_root.path(), None, isolated.to_str(),),
        default
    );

    assert_eq!(
        resolve_acceptance_config_dir(
            &default,
            temporary_root.path(),
            Some("1"),
            Some("C:\\Windows")
        ),
        default
    );
}
