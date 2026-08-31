use std::time::Duration;
use tauri::Url;

const DEVELOPMENT_OPS_ORIGIN: &str = "http://127.0.0.1:3011";

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum RuntimeValidationError {
    MissingOpsOrigin,
    MissingIdentityOrigin,
    InvalidOrigin,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ConnectionError {
    Unavailable,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RuntimeTargets {
    ops_origin: String,
    identity_origin: String,
    development: bool,
}

impl RuntimeTargets {
    pub fn release(
        ops_origin: &str,
        identity_origin: &str,
    ) -> Result<Self, RuntimeValidationError> {
        let ops_origin = exact_https_origin(ops_origin, RuntimeValidationError::MissingOpsOrigin)?;
        let identity_origin = exact_https_origin(
            identity_origin,
            RuntimeValidationError::MissingIdentityOrigin,
        )?;
        Ok(Self {
            ops_origin,
            identity_origin,
            development: false,
        })
    }

    pub fn development() -> Self {
        Self {
            ops_origin: DEVELOPMENT_OPS_ORIGIN.into(),
            identity_origin: String::new(),
            development: true,
        }
    }

    pub(crate) fn launcher_only() -> Self {
        Self {
            ops_origin: String::new(),
            identity_origin: String::new(),
            development: false,
        }
    }

    pub fn ops_origin(&self) -> &str {
        &self.ops_origin
    }

    pub fn identity_origin(&self) -> &str {
        &self.identity_origin
    }

    pub fn health_url(&self) -> String {
        format!("{}/api/health", self.ops_origin)
    }

    pub fn allows_navigation(&self, candidate: &str) -> bool {
        let Ok(url) = Url::parse(candidate) else {
            return false;
        };
        if !url.username().is_empty() || url.password().is_some() {
            return false;
        }
        if is_launcher_url(&url) {
            return true;
        }
        let origin = url.origin().ascii_serialization();
        origin == self.ops_origin
            || (!self.development
                && !self.identity_origin.is_empty()
                && origin == self.identity_origin)
    }
}

fn exact_https_origin(
    value: &str,
    missing: RuntimeValidationError,
) -> Result<String, RuntimeValidationError> {
    if value.trim().is_empty() {
        return Err(missing);
    }
    let url = Url::parse(value).map_err(|_| RuntimeValidationError::InvalidOrigin)?;
    if url.scheme() != "https"
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.path() != "/"
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err(RuntimeValidationError::InvalidOrigin);
    }
    Ok(url.origin().ascii_serialization())
}

fn is_launcher_url(url: &Url) -> bool {
    (url.scheme() == "tauri" && url.host_str() == Some("localhost"))
        || (url.scheme() == "http" && url.host_str() == Some("tauri.localhost"))
}

pub async fn probe_health_endpoint(
    health_url: &str,
    timeout: Duration,
) -> Result<(), ConnectionError> {
    let client = reqwest::Client::builder()
        .timeout(timeout)
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| ConnectionError::Unavailable)?;
    let response = client
        .get(health_url)
        .send()
        .await
        .map_err(|_| ConnectionError::Unavailable)?;
    if response.status().is_success() {
        Ok(())
    } else {
        Err(ConnectionError::Unavailable)
    }
}
