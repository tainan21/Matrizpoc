use std::fs;

use matriz_desktop_native::explorer::{ExplorerService, PreviewContent};

fn fixture() -> (tempfile::TempDir, ExplorerService) {
    let temp = tempfile::tempdir().expect("temp workspace");
    let app = temp.path().join("apps/matriz-admin");
    fs::create_dir_all(app.join("src/assets")).expect("fixture directories");
    fs::create_dir_all(app.join("node_modules/hidden")).expect("ignored directory");
    fs::write(app.join("src/index.ts"), "export const value = 42\n").expect("text file");
    fs::write(
        app.join("src/config.ts"),
        "const port = process.env.PORT\nconst secret = process.env.DATABASE_URL\n",
    )
    .expect("environment references");
    fs::write(
        app.join("src/assets/icon.svg"),
        "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>",
    )
    .expect("svg");
    let service = ExplorerService::new(temp.path().to_path_buf()).expect("service");
    (temp, service)
}

#[test]
fn finds_bounded_environment_references_without_exposing_values() {
    let (temp, service) = fixture();
    fs::write(
        temp.path().join("apps/matriz-admin/node_modules/hidden/secret.ts"),
        "process.env.DATABASE_URL = 'must-not-leak'",
    )
    .expect("ignored secret fixture");

    let result = service
        .find_environment_references("matriz-admin", "DATABASE_URL")
        .expect("reference scan");

    assert_eq!(result.app_id, "matriz-admin");
    assert_eq!(result.key, "DATABASE_URL");
    assert_eq!(result.matches.len(), 1);
    assert_eq!(result.matches[0].relative_path, "src/config.ts");
    assert_eq!(result.matches[0].line, 2);
    assert!(!result.matches[0].excerpt.contains("must-not-leak"));
    assert!(service
        .find_environment_references("matriz-admin", "BAD KEY")
        .is_err());
}

#[test]
fn lists_only_safe_project_entries() {
    let (_temp, service) = fixture();
    let root = service.list("matriz-admin", "").expect("root listing");
    assert!(root
        .entries
        .iter()
        .any(|entry| entry.name == "src" && entry.is_directory));
    assert!(!root
        .entries
        .iter()
        .any(|entry| entry.name == "node_modules"));
}

#[test]
fn previews_text_and_svg_without_leaking_outside_the_app() {
    let (_temp, service) = fixture();
    let text = service
        .preview("matriz-admin", "src/index.ts")
        .expect("text preview");
    assert!(
        matches!(text.content, PreviewContent::Text(ref value) if value.contains("value = 42"))
    );

    let image = service
        .preview("matriz-admin", "src/assets/icon.svg")
        .expect("image preview");
    assert!(
        matches!(image.content, PreviewContent::Image(ref value) if value.starts_with("data:image/svg+xml;base64,"))
    );

    assert!(service
        .preview("matriz-admin", "../spot/package.json")
        .is_err());
}

#[test]
fn protects_runtime_configuration_from_mutation() {
    let (temp, service) = fixture();
    fs::write(temp.path().join("apps/matriz-admin/package.json"), "{}").expect("manifest");
    assert!(service
        .rename("matriz-admin", "package.json", "other.json")
        .is_err());
    assert!(service
        .rename("matriz-admin", "src/index.ts", "main.ts")
        .is_ok());
}

#[test]
fn duplicate_never_overwrites_and_directories_are_not_recycled() {
    let (temp, service) = fixture();
    let app = temp.path().join("apps/matriz-admin");
    fs::write(app.join("src/existing.ts"), "keep me").expect("existing target");
    assert!(service
        .duplicate("matriz-admin", "src/index.ts", "existing.ts")
        .is_err());
    assert_eq!(
        fs::read_to_string(app.join("src/existing.ts")).expect("preserved target"),
        "keep me"
    );
    assert!(service.recycle("matriz-admin", "src").is_err());
    assert!(service
        .duplicate("matriz-admin", "src/index.ts", ".env.local")
        .is_err());
}

#[test]
fn preview_limits_large_text_and_images() {
    let (temp, service) = fixture();
    let app = temp.path().join("apps/matriz-admin/src");
    fs::write(app.join("large.ts"), vec![b'x'; 256 * 1024 + 1]).expect("large text");
    fs::write(app.join("large.png"), vec![0_u8; 8 * 1024 * 1024 + 1]).expect("large image");
    assert!(service.preview("matriz-admin", "src/large.ts").is_err());
    assert!(service.preview("matriz-admin", "src/large.png").is_err());
}
