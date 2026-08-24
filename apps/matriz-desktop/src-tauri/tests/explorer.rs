use std::fs;

use matriz_desktop_native::explorer::{ExplorerService, PreviewContent};

fn fixture() -> (tempfile::TempDir, ExplorerService) {
    let temp = tempfile::tempdir().expect("temp workspace");
    let app = temp.path().join("apps/matriz-admin");
    fs::create_dir_all(app.join("src/assets")).expect("fixture directories");
    fs::create_dir_all(app.join("node_modules/hidden")).expect("ignored directory");
    fs::write(app.join("src/index.ts"), "export const value = 42\n").expect("text file");
    fs::write(app.join("src/assets/icon.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>").expect("svg");
    let service = ExplorerService::new(temp.path().to_path_buf()).expect("service");
    (temp, service)
}

#[test]
fn lists_only_safe_project_entries() {
    let (_temp, service) = fixture();
    let root = service.list("matriz-admin", "").expect("root listing");
    assert!(root.entries.iter().any(|entry| entry.name == "src" && entry.is_directory));
    assert!(!root.entries.iter().any(|entry| entry.name == "node_modules"));
}

#[test]
fn previews_text_and_svg_without_leaking_outside_the_app() {
    let (_temp, service) = fixture();
    let text = service.preview("matriz-admin", "src/index.ts").expect("text preview");
    assert!(matches!(text.content, PreviewContent::Text(ref value) if value.contains("value = 42")));

    let image = service.preview("matriz-admin", "src/assets/icon.svg").expect("image preview");
    assert!(matches!(image.content, PreviewContent::Image(ref value) if value.starts_with("data:image/svg+xml;base64,")));

    assert!(service.preview("matriz-admin", "../spot/package.json").is_err());
}

#[test]
fn protects_runtime_configuration_from_mutation() {
    let (temp, service) = fixture();
    fs::write(temp.path().join("apps/matriz-admin/package.json"), "{}").expect("manifest");
    assert!(service.rename("matriz-admin", "package.json", "other.json").is_err());
    assert!(service.rename("matriz-admin", "src/index.ts", "main.ts").is_ok());
}
