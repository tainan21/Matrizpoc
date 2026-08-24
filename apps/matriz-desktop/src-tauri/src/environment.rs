use std::{
    collections::{HashMap, HashSet},
    fs,
    path::Path,
};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::resources::WorkspaceResourceService;

const ENV_FILES: [&str; 6] = [
    ".env",
    ".env.local",
    ".env.development",
    ".env.staging",
    ".env.production",
    ".env.example",
];
const MAX_ENV_BYTES: usize = 256 * 1024;
const MAX_VARIABLES: usize = 256;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentFile {
    pub file_name: String,
    pub size: u64,
    pub modified_at: u128,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentVariable {
    pub key: String,
    pub value: Option<String>,
    pub sensitive: bool,
    pub source: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentDocument {
    pub app_id: String,
    pub file_name: String,
    pub revision: String,
    pub variables: Vec<EnvironmentVariable>,
    pub missing_required: Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentVariableInput {
    pub key: String,
    pub value: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentSaveRequest {
    pub app_id: String,
    pub file_name: String,
    pub revision: String,
    pub variables: Vec<EnvironmentVariableInput>,
}

#[derive(Clone, Debug)]
enum EnvLine {
    Variable { key: String, value: String },
    Raw(String),
}

pub struct EnvironmentService {
    resources: WorkspaceResourceService,
}

impl EnvironmentService {
    pub fn new(resources: WorkspaceResourceService) -> Self {
        Self { resources }
    }

    pub fn list(&self, app_id: &str) -> Result<Vec<EnvironmentFile>, String> {
        let root = self.resources.app_root(app_id)?;
        let mut files = Vec::new();
        for file_name in ENV_FILES {
            let path = root.join(file_name);
            if !path.is_file() {
                continue;
            }
            let metadata = fs::metadata(&path).map_err(|error| error.to_string())?;
            files.push(EnvironmentFile {
                file_name: file_name.into(),
                size: metadata.len(),
                modified_at: metadata
                    .modified()
                    .ok()
                    .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|duration| duration.as_millis())
                    .unwrap_or_default(),
            });
        }
        Ok(files)
    }

    pub fn read(&self, app_id: &str, file_name: &str) -> Result<EnvironmentDocument, String> {
        validate_env_file(file_name)?;
        let path = self.resources.existing_path(app_id, file_name)?;
        let contents = read_bounded(&path)?;
        let lines = parse(&contents)?;
        let variables = lines
            .iter()
            .filter_map(|line| match line {
                EnvLine::Variable { key, value } => Some(EnvironmentVariable {
                    key: key.clone(),
                    value: (!is_sensitive(key)).then(|| value.clone()),
                    sensitive: is_sensitive(key),
                    source: file_name.into(),
                }),
                EnvLine::Raw(_) => None,
            })
            .collect::<Vec<_>>();
        if variables.len() > MAX_VARIABLES {
            return Err("Environment has more than 256 variables".into());
        }
        let keys = variables
            .iter()
            .map(|item| item.key.as_str())
            .collect::<HashSet<_>>();
        let missing_required = self
            .required_keys(app_id)?
            .into_iter()
            .filter(|key| !keys.contains(key.as_str()))
            .collect();
        Ok(EnvironmentDocument {
            app_id: app_id.into(),
            file_name: file_name.into(),
            revision: revision(&contents),
            variables,
            missing_required,
        })
    }

    pub fn reveal(&self, app_id: &str, file_name: &str, key: &str) -> Result<String, String> {
        validate_env_file(file_name)?;
        validate_key(key)?;
        if !is_sensitive(key) {
            return Err("Only sensitive values require explicit reveal".into());
        }
        let contents = read_bounded(&self.resources.existing_path(app_id, file_name)?)?;
        parse(&contents)?
            .into_iter()
            .find_map(|line| match line {
                EnvLine::Variable {
                    key: candidate,
                    value,
                } if candidate == key => Some(value),
                _ => None,
            })
            .ok_or_else(|| "Environment variable was not found".into())
    }

    pub fn save(&self, request: EnvironmentSaveRequest) -> Result<EnvironmentDocument, String> {
        validate_env_file(&request.file_name)?;
        if request.variables.len() > MAX_VARIABLES {
            return Err("Environment has more than 256 variables".into());
        }
        let path = self
            .resources
            .existing_path(&request.app_id, &request.file_name)?;
        let current = read_bounded(&path)?;
        if revision(&current) != request.revision {
            return Err("Environment changed on disk; reload before saving".into());
        }
        let original = parse(&current)?;
        let existing = original
            .iter()
            .filter_map(|line| match line {
                EnvLine::Variable { key, value } => Some((key.clone(), value.clone())),
                _ => None,
            })
            .collect::<HashMap<_, _>>();
        let mut requested = HashMap::new();
        let mut order = Vec::new();
        for input in request.variables {
            validate_key(&input.key)?;
            if input
                .value
                .as_deref()
                .is_some_and(|value| value.contains(['\n', '\r', '\0']))
            {
                return Err("Environment values cannot contain control newlines".into());
            }
            if requested.insert(input.key.clone(), input.value).is_some() {
                return Err("Environment keys must be unique".into());
            }
            order.push(input.key);
        }
        let mut written = HashSet::new();
        let mut output = Vec::new();
        for line in original {
            match line {
                EnvLine::Raw(raw) => output.push(raw),
                EnvLine::Variable { key, .. } if requested.contains_key(&key) => {
                    let value = requested
                        .get(&key)
                        .and_then(Clone::clone)
                        .or_else(|| existing.get(&key).cloned())
                        .unwrap_or_default();
                    output.push(format!("{key}={value}"));
                    written.insert(key);
                }
                EnvLine::Variable { .. } => {}
            }
        }
        for key in order {
            if written.contains(&key) {
                continue;
            }
            let value = requested.remove(&key).flatten().unwrap_or_default();
            output.push(format!("{key}={value}"));
        }
        let mut contents = output.join("\n");
        if current.ends_with('\n') || !contents.is_empty() {
            contents.push('\n');
        }
        if contents.len() > MAX_ENV_BYTES {
            return Err("Environment exceeds 256 KiB".into());
        }
        atomic_write(&path, contents.as_bytes())?;
        self.read(&request.app_id, &request.file_name)
    }

    fn required_keys(&self, app_id: &str) -> Result<Vec<String>, String> {
        let path = self.resources.app_root(app_id)?.join(".env.example");
        if !path.is_file() {
            return Ok(Vec::new());
        }
        Ok(parse(&read_bounded(&path)?)?
            .into_iter()
            .filter_map(|line| match line {
                EnvLine::Variable { key, .. } => Some(key),
                _ => None,
            })
            .collect())
    }
}

fn validate_env_file(file_name: &str) -> Result<(), String> {
    if ENV_FILES.contains(&file_name) {
        Ok(())
    } else {
        Err("Unsupported environment filename".into())
    }
}

fn validate_key(key: &str) -> Result<(), String> {
    let mut chars = key.chars();
    if !chars
        .next()
        .is_some_and(|c| c == '_' || c.is_ascii_alphabetic())
        || !chars.all(|c| c == '_' || c.is_ascii_alphanumeric())
    {
        return Err("Invalid environment variable key".into());
    }
    Ok(())
}

fn is_sensitive(key: &str) -> bool {
    let upper = key.to_ascii_uppercase();
    [
        "SECRET",
        "TOKEN",
        "PASSWORD",
        "PRIVATE",
        "API_KEY",
        "DATABASE_URL",
        "DSN",
        "CREDENTIAL",
    ]
    .iter()
    .any(|fragment| upper.contains(fragment))
}

fn parse(contents: &str) -> Result<Vec<EnvLine>, String> {
    contents
        .lines()
        .map(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                return Ok(EnvLine::Raw(line.into()));
            }
            let candidate = trimmed.strip_prefix("export ").unwrap_or(trimmed);
            let (key, value) = candidate
                .split_once('=')
                .ok_or("Invalid environment line")?;
            validate_key(key.trim())?;
            Ok(EnvLine::Variable {
                key: key.trim().into(),
                value: value.into(),
            })
        })
        .collect()
}

fn read_bounded(path: &Path) -> Result<String, String> {
    let metadata = fs::metadata(path).map_err(|error| error.to_string())?;
    if metadata.len() > MAX_ENV_BYTES as u64 {
        return Err("Environment exceeds 256 KiB".into());
    }
    fs::read_to_string(path).map_err(|error| format!("Environment must be UTF-8: {error}"))
}

fn revision(contents: &str) -> String {
    format!("{:x}", Sha256::digest(contents.as_bytes()))
}

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let temporary = path.with_extension("env.tmp");
    fs::write(&temporary, bytes).map_err(|error| error.to_string())?;
    fs::rename(&temporary, path).map_err(|error| error.to_string())
}
