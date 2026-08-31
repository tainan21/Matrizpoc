use std::env;
use url::Url;

fn main() {
    println!("cargo:rerun-if-env-changed=MATRIZ_OPS_DESKTOP_URL");
    println!("cargo:rerun-if-env-changed=MATRIZ_IDENTITY_ISSUER");
    if env::var("PROFILE").as_deref() == Ok("release") {
        require_release_origin("MATRIZ_OPS_DESKTOP_URL");
        require_release_origin("MATRIZ_IDENTITY_ISSUER");
    }
    tauri_build::build()
}

fn require_release_origin(name: &str) {
    let value = env::var(name).unwrap_or_else(|_| panic!("{name} is required for release builds"));
    let url = Url::parse(&value).unwrap_or_else(|_| panic!("{name} must be a valid HTTPS origin"));
    if url.scheme() != "https"
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.path() != "/"
        || url.query().is_some()
        || url.fragment().is_some()
    {
        panic!("{name} must be an exact HTTPS origin without credentials, path, query or fragment");
    }
}
