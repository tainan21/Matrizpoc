use std::{
    collections::{BTreeMap, HashMap},
    fs::{self, File, OpenOptions},
    io::{self, Read},
    net::{IpAddr, Ipv4Addr, SocketAddr, TcpStream},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{Arc, Mutex},
    time::Duration,
};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use windows_sys::Win32::{
    Foundation::LocalFree,
    Security::Cryptography::{
        CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    },
};

use crate::{ports, terminal::corepack_pnpm_command};

#[path = "infrastructure_process.rs"]
mod managed_process;

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum InfrastructureServiceId {
    Postgres,
    Garnet,
    Nats,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum InfrastructureTargetId {
    Stack,
    Postgres,
    Garnet,
    Nats,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum InfrastructureAction {
    Install,
    Start,
    Stop,
    Restart,
    Provision,
    Backup,
    Restore,
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct InfrastructureInspection {
    pub installed: bool,
    pub running: bool,
    pub healthy: bool,
    pub owned: bool,
    pub observed_version: Option<String>,
}

pub trait InfrastructureHost: Send + Sync {
    fn inspect(
        &self,
        service_id: InfrastructureServiceId,
    ) -> Result<InfrastructureInspection, String>;
    fn execute(
        &self,
        target_id: InfrastructureTargetId,
        action: InfrastructureAction,
    ) -> Result<(), String>;
    fn logs(&self, service_id: InfrastructureServiceId) -> Result<Vec<String>, String>;
    fn applied_migrations(&self, _schema: &str) -> Result<Vec<AppliedMigration>, String> {
        Ok(Vec::new())
    }
    fn validate_backup(&self, _backup_id: &str) -> Result<(), String> {
        Err("Restore indisponível neste host".into())
    }
    fn restore_backup(&self, _backup_id: &str) -> Result<(), String> {
        Err("Restore indisponível neste host".into())
    }
    fn apply_migrations(&self, _workspace: &Path) -> Result<(), String> {
        Err("Aplicação de migrations indisponível neste host".into())
    }
    fn seed_local(&self, _workspace: &Path) -> Result<(), String> {
        Err("Seed local indisponível neste host".into())
    }
    fn event_diagnostics(&self) -> Result<Vec<EventQueueDiagnostic>, String> {
        Ok(Vec::new())
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InfrastructureServiceSnapshot {
    pub id: InfrastructureServiceId,
    pub display_name: &'static str,
    pub version: &'static str,
    pub ports: &'static [u16],
    pub state: &'static str,
    pub message: &'static str,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InfrastructureSnapshot {
    pub revision: String,
    pub root: String,
    pub services: Vec<InfrastructureServiceSnapshot>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InfrastructurePreviewRequest {
    pub target_id: InfrastructureTargetId,
    pub action_id: InfrastructureAction,
    pub revision: String,
    #[serde(default)]
    pub backup_id: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InfrastructureActionPreview {
    pub confirmation_token: String,
    pub target_id: InfrastructureTargetId,
    pub action_id: InfrastructureAction,
    pub title: String,
    pub impact: Vec<String>,
    pub expires_at: u64,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationFileDigest {
    pub name: String,
    pub checksum: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AppliedMigration {
    pub name: String,
    pub checksum: String,
    pub finished: bool,
    pub rolled_back: bool,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationLedgerComparison {
    pub state: &'static str,
    pub pending: Vec<String>,
    pub altered: Vec<String>,
    pub unexpected: Vec<String>,
    pub failed: Vec<String>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationSchemaSnapshot {
    pub schema: String,
    pub ledger: MigrationLedgerComparison,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseMigrationSnapshot {
    pub state: &'static str,
    pub schemas: Vec<MigrationSchemaSnapshot>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseMigrationPreview {
    pub confirmation_token: String,
    pub expires_at: u64,
    pub title: String,
    pub impact: Vec<String>,
    pub schemas: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseSeedPreview {
    pub confirmation_token: String,
    pub expires_at: u64,
    pub title: String,
    pub impact: Vec<String>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventQueueDiagnostic {
    pub schema: String,
    pub queue: &'static str,
    pub available: bool,
    pub pending: u64,
    pub retries: u64,
    pub dead_letters: u64,
    pub oldest_at: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupRecord {
    pub id: String,
    pub created_at: u64,
    pub bytes: u64,
    pub sha256: String,
    pub integrity: &'static str,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackupReceipt {
    version: u8,
    id: String,
    file_name: String,
    created_at: u64,
    bytes: u64,
    sha256: String,
}

pub fn compare_migration_ledger(
    files: &[MigrationFileDigest],
    applied: &[AppliedMigration],
) -> Result<MigrationLedgerComparison, String> {
    let unique_files: std::collections::HashSet<_> = files.iter().map(|item| &item.name).collect();
    let unique_applied: std::collections::HashSet<_> =
        applied.iter().map(|item| &item.name).collect();
    if unique_files.len() != files.len() || unique_applied.len() != applied.len() {
        return Err("O ledger contém nomes de migration duplicados".into());
    }
    let files_by_name: HashMap<_, _> = files.iter().map(|item| (&item.name, item)).collect();
    let applied_by_name: HashMap<_, _> = applied.iter().map(|item| (&item.name, item)).collect();
    let pending: Vec<String> = files
        .iter()
        .filter(|item| !applied_by_name.contains_key(&item.name))
        .map(|item| item.name.clone())
        .collect();
    let altered: Vec<String> = files
        .iter()
        .filter(|item| {
            applied_by_name
                .get(&item.name)
                .is_some_and(|row| !row.checksum.eq_ignore_ascii_case(&item.checksum))
        })
        .map(|item| item.name.clone())
        .collect();
    let unexpected: Vec<String> = applied
        .iter()
        .filter(|item| !item.rolled_back && !files_by_name.contains_key(&item.name))
        .map(|item| item.name.clone())
        .collect();
    let failed = applied
        .iter()
        .filter(|item| !item.finished && !item.rolled_back)
        .map(|item| item.name.clone())
        .collect::<Vec<_>>();
    let state = if !failed.is_empty() {
        "failed"
    } else if !altered.is_empty() || !unexpected.is_empty() {
        "drifted"
    } else if !pending.is_empty() {
        "pending"
    } else {
        "clean"
    };
    Ok(MigrationLedgerComparison {
        state,
        pending,
        altered,
        unexpected,
        failed,
    })
}

const DATABASE_SCHEMAS: &[&str] = &[
    "core",
    "hub",
    "spot",
    "seumei",
    "contracts",
    "willdash",
    "ops",
    "pay",
];

const LOCAL_OIDC_CLIENT_SECRETS: &[(&str, &str)] = &[
    ("OIDC_CLIENT_SECRET_CONTRACTS", "oidc-contracts"),
    ("OIDC_CLIENT_SECRET_MATRIZ_ADMIN", "oidc-matriz-admin"),
    (
        "OIDC_CLIENT_SECRET_MATRIZ_CLIENT_ADMIN",
        "oidc-matriz-client-admin",
    ),
    ("OIDC_CLIENT_SECRET_MATRIZ_HUB", "oidc-matriz-hub"),
    ("OIDC_CLIENT_SECRET_MATRIZ_OPS", "oidc-matriz-ops"),
    ("OIDC_CLIENT_SECRET_MATRIZ_PAY", "oidc-matriz-pay"),
    ("OIDC_CLIENT_SECRET_SEUMEI", "oidc-seumei"),
    ("OIDC_CLIENT_SECRET_SPOT", "oidc-spot"),
    ("OIDC_CLIENT_SECRET_WILLDASH", "oidc-willdash"),
];

pub fn read_migration_files(
    workspace: &Path,
) -> Result<BTreeMap<String, Vec<MigrationFileDigest>>, String> {
    let workspace = workspace
        .canonicalize()
        .map_err(|error| error.to_string())?;
    let mut schemas = BTreeMap::new();
    for schema in DATABASE_SCHEMAS {
        let root = workspace.join("prisma").join(schema).join("migrations");
        let mut migrations = Vec::new();
        if root.is_dir() {
            for entry in fs::read_dir(&root).map_err(|error| error.to_string())? {
                let entry = entry.map_err(|error| error.to_string())?;
                let metadata =
                    fs::symlink_metadata(entry.path()).map_err(|error| error.to_string())?;
                if metadata.file_type().is_symlink() || !metadata.is_dir() {
                    continue;
                }
                let migration = entry.path().join("migration.sql");
                let migration_metadata = match fs::symlink_metadata(&migration) {
                    Ok(metadata) => metadata,
                    Err(error) if error.kind() == io::ErrorKind::NotFound => continue,
                    Err(error) => return Err(error.to_string()),
                };
                if migration_metadata.file_type().is_symlink() || !migration_metadata.is_file() {
                    continue;
                }
                let canonical = migration
                    .canonicalize()
                    .map_err(|error| error.to_string())?;
                if !canonical.starts_with(&workspace) {
                    return Err("Migration fora do workspace canônico recusada".into());
                }
                let name = entry.file_name().to_string_lossy().into_owned();
                if !valid_migration_name(&name) {
                    return Err(format!("Nome de migration inválido em {schema}"));
                }
                let contents = fs::read(canonical).map_err(|error| error.to_string())?;
                migrations.push(MigrationFileDigest {
                    name,
                    checksum: format!("{:x}", Sha256::digest(contents)),
                });
            }
            migrations.sort_by(|left, right| left.name.cmp(&right.name));
        }
        schemas.insert((*schema).into(), migrations);
    }
    Ok(schemas)
}

pub fn read_backup_catalog(root: &Path) -> Result<Vec<BackupRecord>, String> {
    let root = root.canonicalize().map_err(|error| error.to_string())?;
    let backups = root.join("backups");
    if !backups.is_dir() {
        return Ok(Vec::new());
    }
    let mut records = Vec::new();
    for entry in fs::read_dir(&backups).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        if entry.path().extension().and_then(|value| value.to_str()) != Some("json") {
            continue;
        }
        let receipt: BackupReceipt =
            serde_json::from_slice(&fs::read(entry.path()).map_err(|error| error.to_string())?)
                .map_err(|error| format!("Recibo de backup inválido: {error}"))?;
        if receipt.version != 1
            || receipt.file_name != format!("{}.dump", receipt.id)
            || !receipt.id.starts_with("backup-")
        {
            return Err("Recibo de backup fora do contrato nativo".into());
        }
        let dump = backups.join(&receipt.file_name);
        let metadata = fs::symlink_metadata(&dump).map_err(|error| error.to_string())?;
        let canonical = dump.canonicalize().map_err(|error| error.to_string())?;
        let valid_file = metadata.is_file()
            && !metadata.file_type().is_symlink()
            && canonical.starts_with(&root)
            && metadata.len() == receipt.bytes;
        let actual_sha = if valid_file {
            sha256_file(&canonical)?
        } else {
            String::new()
        };
        records.push(BackupRecord {
            id: receipt.id,
            created_at: receipt.created_at,
            bytes: receipt.bytes,
            sha256: receipt.sha256.clone(),
            integrity: if valid_file && actual_sha.eq_ignore_ascii_case(&receipt.sha256) {
                "verified"
            } else {
                "invalid"
            },
        });
    }
    records.sort_by(|left, right| right.created_at.cmp(&left.created_at));
    Ok(records)
}

pub fn resolve_verified_backup(root: &Path, backup_id: &str) -> Result<PathBuf, String> {
    if !backup_id.starts_with("backup-")
        || backup_id.len() > 80
        || !backup_id
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '-')
    {
        return Err("ID de backup inválido".into());
    }
    let record = read_backup_catalog(root)?
        .into_iter()
        .find(|record| record.id == backup_id)
        .ok_or("Backup não encontrado no catálogo nativo")?;
    if record.integrity != "verified" {
        return Err("A integridade do backup não foi confirmada".into());
    }
    let root = root.canonicalize().map_err(|error| error.to_string())?;
    let dump = root
        .join("backups")
        .join(format!("{backup_id}.dump"))
        .canonicalize()
        .map_err(|error| error.to_string())?;
    if !dump.starts_with(&root) {
        return Err("Backup fora do diretório gerenciado".into());
    }
    Ok(dump)
}

fn sha256_file(path: &Path) -> Result<String, String> {
    let mut file = File::open(path).map_err(|error| error.to_string())?;
    let mut digest = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = file.read(&mut buffer).map_err(|error| error.to_string())?;
        if read == 0 {
            break;
        }
        digest.update(&buffer[..read]);
    }
    Ok(format!("{:x}", digest.finalize()))
}

#[derive(Clone)]
struct PendingAction {
    target_id: InfrastructureTargetId,
    action_id: InfrastructureAction,
    revision: String,
    expires_at: u64,
    backup_id: Option<String>,
}

#[derive(Clone)]
struct PendingMigrations {
    workspace: PathBuf,
    plan_digest: String,
    expires_at: u64,
}

#[derive(Clone)]
struct PendingSeed {
    workspace: PathBuf,
    plan_digest: String,
    expires_at: u64,
}

pub struct InfrastructureManager {
    host: Box<dyn InfrastructureHost>,
    root: String,
    now: Arc<dyn Fn() -> u64 + Send + Sync>,
    pending: Mutex<HashMap<String, PendingAction>>,
    pending_migrations: Mutex<HashMap<String, PendingMigrations>>,
    pending_seeds: Mutex<HashMap<String, PendingSeed>>,
}

impl InfrastructureManager {
    pub fn new(
        host: Box<dyn InfrastructureHost>,
        now: impl Fn() -> u64 + Send + Sync + 'static,
    ) -> Self {
        Self::at(host, "%LOCALAPPDATA%\\Matriz\\Infrastructure".into(), now)
    }

    pub fn at(
        host: Box<dyn InfrastructureHost>,
        root: String,
        now: impl Fn() -> u64 + Send + Sync + 'static,
    ) -> Self {
        Self {
            host,
            root,
            now: Arc::new(now),
            pending: Mutex::new(HashMap::new()),
            pending_migrations: Mutex::new(HashMap::new()),
            pending_seeds: Mutex::new(HashMap::new()),
        }
    }

    pub fn snapshot(&self) -> Result<InfrastructureSnapshot, String> {
        let mut digest = Sha256::new();
        let mut services = Vec::with_capacity(CATALOG.len());
        for definition in CATALOG {
            let inspection = self.host.inspect(definition.id)?;
            digest.update(format!("{:?}:{inspection:?}", definition.id));
            let state = state(&inspection);
            services.push(InfrastructureServiceSnapshot {
                id: definition.id,
                display_name: definition.display_name,
                version: definition.version,
                ports: definition.ports,
                state,
                message: state_message(state),
            });
        }
        Ok(InfrastructureSnapshot {
            revision: format!("{:x}", digest.finalize()),
            root: self.root.clone(),
            services,
        })
    }

    pub fn preview(
        &self,
        request: InfrastructurePreviewRequest,
    ) -> Result<InfrastructureActionPreview, String> {
        let current = self.snapshot()?;
        if current.revision != request.revision {
            return Err("O snapshot de infraestrutura está desatualizado".into());
        }
        authorize(&current, request.target_id, request.action_id)?;
        if request.action_id == InfrastructureAction::Restore {
            let backup_id = request
                .backup_id
                .as_deref()
                .ok_or("Restore exige um backupId opaco")?;
            self.host.validate_backup(backup_id)?;
        } else if request.backup_id.is_some() {
            return Err("backupId só é aceito para restore".into());
        }
        let token = uuid::Uuid::new_v4().to_string();
        let expires_at = (self.now)().saturating_add(30_000);
        self.pending
            .lock()
            .map_err(|_| "Confirmações de infraestrutura indisponíveis".to_string())?
            .insert(
                token.clone(),
                PendingAction {
                    target_id: request.target_id,
                    action_id: request.action_id,
                    revision: request.revision,
                    expires_at,
                    backup_id: request.backup_id,
                },
            );
        Ok(InfrastructureActionPreview {
            confirmation_token: token,
            target_id: request.target_id,
            action_id: request.action_id,
            title: format!(
                "{} {}",
                action_label(request.action_id),
                target_label(request.target_id)
            ),
            impact: vec![
                "Execução local e portátil, sem Serviços Windows".into(),
                "A operação será revalidada imediatamente antes da execução".into(),
            ],
            expires_at,
        })
    }

    pub fn confirm(&self, token: &str) -> Result<InfrastructureSnapshot, String> {
        let pending = self
            .pending
            .lock()
            .map_err(|_| "Confirmações de infraestrutura indisponíveis".to_string())?
            .remove(token)
            .ok_or("Token de confirmação inválido ou já utilizado; tokens são de uso único")?;
        if (self.now)() > pending.expires_at {
            return Err("O token de confirmação expirou".into());
        }
        let current = self.snapshot()?;
        if current.revision != pending.revision {
            return Err("A infraestrutura mudou após a prévia; confirme novamente".into());
        }
        authorize(&current, pending.target_id, pending.action_id)?;
        if pending.action_id == InfrastructureAction::Restore {
            let backup_id = pending.backup_id.as_deref().ok_or("Restore sem backupId")?;
            self.host.validate_backup(backup_id)?;
            self.host.restore_backup(backup_id)?;
        } else {
            self.host.execute(pending.target_id, pending.action_id)?;
        }
        self.snapshot()
    }

    pub fn logs(&self, service_id: InfrastructureServiceId) -> Result<Vec<String>, String> {
        Ok(self
            .host
            .logs(service_id)?
            .into_iter()
            .rev()
            .take(200)
            .map(|line| redact(&line))
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect())
    }

    pub fn migrations(&self, workspace: &Path) -> Result<DatabaseMigrationSnapshot, String> {
        let files = read_migration_files(workspace)?;
        let mut schemas = Vec::with_capacity(DATABASE_SCHEMAS.len());
        for schema in DATABASE_SCHEMAS {
            let applied = self.host.applied_migrations(schema)?;
            let ledger = compare_migration_ledger(
                files.get(*schema).map(Vec::as_slice).unwrap_or_default(),
                &applied,
            )?;
            schemas.push(MigrationSchemaSnapshot {
                schema: (*schema).into(),
                ledger,
            });
        }
        let state = if schemas.iter().any(|item| item.ledger.state == "failed") {
            "failed"
        } else if schemas.iter().any(|item| item.ledger.state == "drifted") {
            "drifted"
        } else if schemas.iter().any(|item| item.ledger.state == "pending") {
            "pending"
        } else {
            "clean"
        };
        Ok(DatabaseMigrationSnapshot { state, schemas })
    }

    pub fn preview_migrations(&self, workspace: &Path) -> Result<DatabaseMigrationPreview, String> {
        let workspace = workspace
            .canonicalize()
            .map_err(|error| error.to_string())?;
        let snapshot = self.migrations(&workspace)?;
        if matches!(snapshot.state, "drifted" | "failed") {
            return Err("Migrations alteradas ou com falha exigem resolução explícita".into());
        }
        let schemas: Vec<_> = snapshot
            .schemas
            .iter()
            .filter(|item| !item.ledger.pending.is_empty())
            .map(|item| item.schema.clone())
            .collect();
        let count: usize = snapshot
            .schemas
            .iter()
            .map(|item| item.ledger.pending.len())
            .sum();
        if count == 0 {
            return Err("Não há migrations pendentes".into());
        }
        let plan_digest = migration_plan_digest(&snapshot, &workspace)?;
        let token = uuid::Uuid::new_v4().to_string();
        let expires_at = (self.now)().saturating_add(300_000);
        self.pending_migrations
            .lock()
            .map_err(|_| "Confirmações de migration indisponíveis".to_string())?
            .insert(
                token.clone(),
                PendingMigrations {
                    workspace,
                    plan_digest,
                    expires_at,
                },
            );
        Ok(DatabaseMigrationPreview {
            confirmation_token: token,
            expires_at,
            title: format!("Aplicar {count} migration(s) pendente(s)"),
            impact: vec![
                "Um backup de guarda será criado antes de qualquer alteração".into(),
                "Checksums e ledger serão revalidados antes e depois da execução".into(),
            ],
            schemas,
        })
    }

    pub fn confirm_migrations(
        &self,
        token: &str,
        workspace: &Path,
    ) -> Result<DatabaseMigrationSnapshot, String> {
        let pending = self
            .pending_migrations
            .lock()
            .map_err(|_| "Confirmações de migration indisponíveis".to_string())?
            .remove(token)
            .ok_or("Token de migration inválido ou já utilizado")?;
        if (self.now)() > pending.expires_at {
            return Err("O token de migration expirou".into());
        }
        let workspace = workspace
            .canonicalize()
            .map_err(|error| error.to_string())?;
        if workspace != pending.workspace {
            return Err("O workspace mudou após a prévia".into());
        }
        let before = self.migrations(&workspace)?;
        if migration_plan_digest(&before, &workspace)? != pending.plan_digest {
            return Err("O plano de migrations mudou após a prévia".into());
        }
        self.host.apply_migrations(&workspace)?;
        let after = self.migrations(&workspace)?;
        if after.state != "clean" {
            return Err("A verificação final das migrations não produziu ledgers limpos".into());
        }
        Ok(after)
    }

    pub fn preview_seed(&self, workspace: &Path) -> Result<DatabaseSeedPreview, String> {
        let workspace = workspace
            .canonicalize()
            .map_err(|error| error.to_string())?;
        self.assert_seed_ready(&workspace)?;
        let plan_digest = seed_plan_digest(&workspace, &self.migrations(&workspace)?)?;
        let token = uuid::Uuid::new_v4().to_string();
        let expires_at = (self.now)().saturating_add(300_000);
        self.pending_seeds
            .lock()
            .map_err(|_| "Confirmações de seed indisponíveis".to_string())?
            .insert(
                token.clone(),
                PendingSeed {
                    workspace,
                    plan_digest,
                    expires_at,
                },
            );
        Ok(DatabaseSeedPreview {
            confirmation_token: token,
            expires_at,
            title: "Popular dados locais de desenvolvimento".into(),
            impact: vec![
                "Disponível somente para a infraestrutura portátil local".into(),
                "O seed é idempotente e usa apenas os oito bancos com ledger limpo".into(),
            ],
        })
    }

    pub fn confirm_seed(&self, token: &str, workspace: &Path) -> Result<(), String> {
        let pending = self
            .pending_seeds
            .lock()
            .map_err(|_| "Confirmações de seed indisponíveis".to_string())?
            .remove(token)
            .ok_or("Token de seed inválido ou já utilizado")?;
        if (self.now)() > pending.expires_at {
            return Err("O token de seed expirou".into());
        }
        let workspace = workspace
            .canonicalize()
            .map_err(|error| error.to_string())?;
        if workspace != pending.workspace {
            return Err("O workspace mudou após a prévia do seed".into());
        }
        self.assert_seed_ready(&workspace)?;
        if seed_plan_digest(&workspace, &self.migrations(&workspace)?)? != pending.plan_digest {
            return Err("O plano local mudou após a prévia do seed".into());
        }
        self.host.seed_local(&workspace)
    }

    fn assert_seed_ready(&self, workspace: &Path) -> Result<(), String> {
        let snapshot = self.snapshot()?;
        if snapshot.services.len() != CATALOG.len()
            || snapshot
                .services
                .iter()
                .any(|service| service.state != "healthy")
        {
            return Err("Seed exige a stack portátil integralmente saudável".into());
        }
        if self.migrations(workspace)?.state != "clean" {
            return Err("Seed exige os oito ledgers de migration limpos".into());
        }
        Ok(())
    }

    pub fn backups(&self) -> Result<Vec<BackupRecord>, String> {
        read_backup_catalog(Path::new(&self.root))
    }

    pub fn event_diagnostics(&self) -> Result<Vec<EventQueueDiagnostic>, String> {
        self.host.event_diagnostics()
    }
}

fn migration_plan_digest(
    snapshot: &DatabaseMigrationSnapshot,
    workspace: &Path,
) -> Result<String, String> {
    let files = read_migration_files(workspace)?;
    let serialized = serde_json::to_vec(&(snapshot, files)).map_err(|error| error.to_string())?;
    Ok(format!("{:x}", Sha256::digest(serialized)))
}

fn seed_plan_digest(
    workspace: &Path,
    migrations: &DatabaseMigrationSnapshot,
) -> Result<String, String> {
    let script = workspace
        .join("tooling/scripts/seed-local-dev.ts")
        .canonicalize()
        .map_err(|_| "Script de seed local não encontrado no workspace".to_string())?;
    if !script.starts_with(workspace) {
        return Err("Script de seed fora do workspace canônico".into());
    }
    let metadata = fs::symlink_metadata(&script).map_err(|error| error.to_string())?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err("Script de seed local inválido".into());
    }
    let mut digest = Sha256::new();
    digest.update(serde_json::to_vec(migrations).map_err(|error| error.to_string())?);
    digest.update(fs::read(script).map_err(|error| error.to_string())?);
    Ok(format!("{:x}", digest.finalize()))
}

struct ServiceDefinition {
    id: InfrastructureServiceId,
    display_name: &'static str,
    version: &'static str,
    ports: &'static [u16],
}

const CATALOG: &[ServiceDefinition] = &[
    ServiceDefinition {
        id: InfrastructureServiceId::Postgres,
        display_name: "PostgreSQL",
        version: "17.11",
        ports: &[55432],
    },
    ServiceDefinition {
        id: InfrastructureServiceId::Garnet,
        display_name: "Garnet",
        version: "2.1.5",
        ports: &[46379],
    },
    ServiceDefinition {
        id: InfrastructureServiceId::Nats,
        display_name: "NATS JetStream",
        version: "2.14.5",
        ports: &[54222, 58222],
    },
];

struct ArtifactDefinition {
    url: &'static str,
    bytes: u64,
    sha256: &'static str,
}

pub struct PortableInfrastructureHost {
    root: PathBuf,
}

impl PortableInfrastructureHost {
    pub fn new(root: PathBuf) -> Self {
        Self { root }
    }

    fn launch_receipt(&self, service_id: InfrastructureServiceId) -> PathBuf {
        self.root.join("control/processes").join(match service_id {
            InfrastructureServiceId::Postgres => "postgres.json",
            InfrastructureServiceId::Garnet => "garnet.json",
            InfrastructureServiceId::Nats => "nats.json",
        })
    }

    fn launch(
        &self,
        service_id: InfrastructureServiceId,
        command: &mut Command,
    ) -> Result<(), String> {
        if self.inspect(service_id)?.running {
            return Err("A porta do serviço já está ocupada; inicialização recusada".into());
        }
        let mut child = command.spawn().map_err(|error| error.to_string())?;
        if let Err(error) = managed_process::record(
            &child,
            &self.executable(service_id),
            &self.launch_receipt(service_id),
        ) {
            // Only this newly spawned child is affected if durable ownership cannot be recorded.
            let _ = child.kill();
            let _ = child.wait();
            return Err(error);
        }
        Ok(())
    }

    fn executable(&self, service_id: InfrastructureServiceId) -> PathBuf {
        match service_id {
            InfrastructureServiceId::Postgres => {
                self.root.join("postgres/17.11/pgsql/bin/postgres.exe")
            }
            InfrastructureServiceId::Garnet => {
                self.root.join("garnet/2.1.5/Service/Garnet.worker.exe")
            }
            InfrastructureServiceId::Nats => self.root.join("nats/2.14.5/nats-server.exe"),
        }
    }

    fn secret(&self, name: &str) -> Result<String, String> {
        let vault = self.root.join("control/vault");
        fs::create_dir_all(&vault).map_err(|error| error.to_string())?;
        let path = vault.join(format!("{name}.dpapi"));
        if path.is_file() {
            return unprotect_secret(&fs::read(path).map_err(|error| error.to_string())?);
        }
        let secret = format!(
            "mz_{}{}",
            uuid::Uuid::new_v4().simple(),
            uuid::Uuid::new_v4().simple()
        );
        let protected = protect_secret(secret.as_bytes())?;
        let temporary = vault.join(format!(".{name}-{}.tmp", uuid::Uuid::new_v4()));
        let mut output = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&temporary)
            .map_err(|error| error.to_string())?;
        use std::io::Write;
        output
            .write_all(&protected)
            .map_err(|error| error.to_string())?;
        output.sync_all().map_err(|error| error.to_string())?;
        drop(output);
        if path.exists() {
            let _ = fs::remove_file(&temporary);
            return unprotect_secret(&fs::read(path).map_err(|error| error.to_string())?);
        }
        fs::rename(&temporary, &path).map_err(|error| error.to_string())?;
        Ok(secret)
    }

    fn artifact(service_id: InfrastructureServiceId) -> ArtifactDefinition {
        match service_id {
            InfrastructureServiceId::Postgres => ArtifactDefinition {
                url: "https://get.enterprisedb.com/postgresql/postgresql-17.11-3-windows-x64-binaries.zip",
                bytes: 341_325_378,
                sha256: "4b8db0930c38f6ef845db919551dedda3b6b845aeb0927b3d79a6e8e9e4537cf",
            },
            InfrastructureServiceId::Garnet => ArtifactDefinition {
                url: "https://github.com/microsoft/garnet/releases/download/v2.1.5/win-x64-based-readytorun.zip",
                bytes: 49_762_902,
                sha256: "7d1d40254ef11dbb12bf59c07b6543a04f2b51049f515cfc9745f556f96c7466",
            },
            InfrastructureServiceId::Nats => ArtifactDefinition {
                url: "https://github.com/nats-io/nats-server/releases/download/v2.14.5/nats-server-v2.14.5-windows-amd64.zip",
                bytes: 7_072_774,
                sha256: "f66f840a211ab665083b88e9b7edbcf6296cda143be47e53e6f6bb8520692bbb",
            },
        }
    }

    fn install(&self, service_id: InfrastructureServiceId) -> Result<(), String> {
        if self.executable(service_id).exists() {
            if service_id == InfrastructureServiceId::Garnet {
                crate::store_release::verify_authenticode(
                    &self.executable(service_id),
                    "Microsoft Corporation",
                )?;
            }
            return Ok(());
        }
        fs::create_dir_all(&self.root).map_err(|error| error.to_string())?;
        let staging = self.root.join(format!(".staging-{}", uuid::Uuid::new_v4()));
        fs::create_dir(&staging).map_err(|error| error.to_string())?;
        let result = self.install_into(service_id, &staging);
        let _ = fs::remove_dir_all(&staging);
        result
    }

    fn install_into(
        &self,
        service_id: InfrastructureServiceId,
        staging: &Path,
    ) -> Result<(), String> {
        let artifact = Self::artifact(service_id);
        let archive_path = staging.join("artifact.zip");
        download_verified(&artifact, &archive_path)?;
        let expanded = staging.join("expanded");
        extract_verified_zip(&archive_path, &expanded)?;
        let (source, target) = match service_id {
            InfrastructureServiceId::Postgres => (expanded, self.root.join("postgres/17.11")),
            InfrastructureServiceId::Garnet => {
                (expanded.join("net8.0"), self.root.join("garnet/2.1.5"))
            }
            InfrastructureServiceId::Nats => {
                let source = fs::read_dir(&expanded)
                    .map_err(|error| error.to_string())?
                    .filter_map(Result::ok)
                    .map(|entry| entry.path().join("nats-server.exe"))
                    .find(|candidate| candidate.is_file())
                    .ok_or("O layout verificado do NATS não contém nats-server.exe")?;
                let target = self.root.join("nats/2.14.5");
                fs::create_dir_all(&target).map_err(|error| error.to_string())?;
                let destination = target.join("nats-server.exe");
                if destination.exists() {
                    return Err("A instalação do NATS mudou durante a operação".into());
                }
                fs::copy(source, destination).map_err(|error| error.to_string())?;
                return Ok(());
            }
        };
        if !expected_in_source(service_id, &source).is_file() {
            return Err("O arquivo verificado não contém o executável esperado".into());
        }
        if service_id == InfrastructureServiceId::Garnet {
            crate::store_release::verify_authenticode(
                &expected_in_source(service_id, &source),
                "Microsoft Corporation",
            )?;
        }
        let parent = target
            .parent()
            .ok_or("Destino de infraestrutura inválido")?;
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        if target.exists() {
            return Err("O destino de infraestrutura mudou durante a operação".into());
        }
        fs::rename(source, target).map_err(|error| error.to_string())
    }

    fn start_nats(&self) -> Result<(), String> {
        let executable = self.executable(InfrastructureServiceId::Nats);
        if !executable.is_file() {
            return Err("NATS não está instalado".into());
        }
        let data = self.root.join("nats/data");
        let logs = self.root.join("nats/logs");
        fs::create_dir_all(&data).map_err(|error| error.to_string())?;
        fs::create_dir_all(&logs).map_err(|error| error.to_string())?;
        let config = self.root.join("nats/nats.conf");
        if !config.is_file() {
            let password = self.secret("nats-control")?;
            let verifier =
                bcrypt::hash(password, bcrypt::DEFAULT_COST).map_err(|error| error.to_string())?;
            let contents = format!(
                "server_name: MatrizNats\nhost: 127.0.0.1\nport: 54222\nhttp: 127.0.0.1:58222\njetstream {{ store_dir: {:?} }}\nauthorization {{ users: [{{ user: \"matriz_control\", password: {:?}, permissions: {{ publish: [\"$JS.API.>\"], subscribe: [\"_INBOX.>\"] }} }}] }}\n",
                data.to_string_lossy().replace('\\', "/"), verifier
            );
            write_new_file(&config, contents.as_bytes())?;
        }
        let log = OpenOptions::new()
            .create(true)
            .append(true)
            .open(logs.join("service.log"))
            .map_err(|error| error.to_string())?;
        let stderr = log.try_clone().map_err(|error| error.to_string())?;
        self.launch(
            InfrastructureServiceId::Nats,
            Command::new(executable)
                .args(["--config"])
                .arg(config)
                .stdin(Stdio::null())
                .stdout(Stdio::from(log))
                .stderr(Stdio::from(stderr))
                .creation_flags(0x0800_0000),
        )?;
        Ok(())
    }

    fn start_postgres(&self) -> Result<(), String> {
        let bin = self.root.join("postgres/17.11/pgsql/bin");
        let executable = bin.join("postgres.exe");
        let initdb = bin.join("initdb.exe");
        let psql = bin.join("psql.exe");
        if !executable.is_file() || !initdb.is_file() || !psql.is_file() {
            return Err("A instalação portátil do PostgreSQL está incompleta".into());
        }
        let data = self.root.join("postgres/data");
        let logs = self.root.join("postgres/logs");
        fs::create_dir_all(&logs).map_err(|error| error.to_string())?;
        let password = self.secret("postgres-bootstrap")?;
        if !data.join("PG_VERSION").is_file() {
            fs::create_dir_all(&data).map_err(|error| error.to_string())?;
            let password_file = self.root.join(format!(
                "control/.postgres-password-{}.tmp",
                uuid::Uuid::new_v4()
            ));
            write_new_file(&password_file, password.as_bytes())?;
            let status = Command::new(&initdb)
                .args(["-D"])
                .arg(&data)
                .args([
                    "-U",
                    "matriz_provisioner",
                    "--auth-host=scram-sha-256",
                    "--auth-local=scram-sha-256",
                ])
                .arg(format!("--pwfile={}", password_file.display()))
                .args(["--encoding=UTF8", "--locale=C"])
                .creation_flags(0x0800_0000)
                .status()
                .map_err(|error| error.to_string());
            let _ = fs::remove_file(&password_file);
            if !status
                .map_err(|error| format!("Falha ao inicializar PostgreSQL: {error}"))?
                .success()
            {
                return Err("A inicialização do PostgreSQL falhou".into());
            }
            use std::io::Write;
            OpenOptions::new().append(true).open(data.join("postgresql.conf"))
                .and_then(|mut file| file.write_all(b"\nlisten_addresses = '127.0.0.1'\nport = 55432\npassword_encryption = 'scram-sha-256'\nmax_connections = 80\n"))
                .map_err(|error| error.to_string())?;
            fs::write(data.join("pg_hba.conf"), b"local all all scram-sha-256\r\nhost all all 127.0.0.1/32 scram-sha-256\r\nhost all all ::1/128 reject\r\n")
                .map_err(|error| error.to_string())?;
        }
        let log = OpenOptions::new()
            .create(true)
            .append(true)
            .open(logs.join("service.log"))
            .map_err(|error| error.to_string())?;
        let stderr = log.try_clone().map_err(|error| error.to_string())?;
        self.launch(
            InfrastructureServiceId::Postgres,
            Command::new(executable)
                .args(["-D"])
                .arg(&data)
                .args(["-p", "55432"])
                .stdin(Stdio::null())
                .stdout(Stdio::from(log))
                .stderr(Stdio::from(stderr))
                .creation_flags(0x0800_0000),
        )?;
        wait_for_port(55432, Duration::from_secs(20))?;
        let exists = Command::new(psql)
            .env("PGPASSWORD", &password)
            .args([
                "--host",
                "127.0.0.1",
                "--port",
                "55432",
                "--username",
                "matriz_provisioner",
                "--dbname",
                "postgres",
                "--no-password",
                "--tuples-only",
                "--no-align",
                "--command",
                "SELECT 1 FROM pg_database WHERE datname = 'matriz';",
            ])
            .creation_flags(0x0800_0000)
            .output()
            .map_err(|error| error.to_string())?;
        if !exists.status.success() {
            return Err(format!(
                "PostgreSQL iniciou, mas a autoridade local não autenticou: {}",
                redact(&String::from_utf8_lossy(&exists.stderr))
            ));
        }
        if String::from_utf8_lossy(&exists.stdout).trim() != "1" {
            let created = Command::new(bin.join("createdb.exe"))
                .env("PGPASSWORD", password)
                .args([
                    "--host",
                    "127.0.0.1",
                    "--port",
                    "55432",
                    "--username",
                    "matriz_provisioner",
                    "--owner",
                    "matriz_provisioner",
                    "--no-password",
                    "matriz",
                ])
                .creation_flags(0x0800_0000)
                .status()
                .map_err(|error| error.to_string())?;
            if !created.success() {
                return Err("PostgreSQL iniciou, mas o database matriz não foi criado".into());
            }
        }
        Ok(())
    }

    fn start_garnet(&self) -> Result<(), String> {
        let executable = self.executable(InfrastructureServiceId::Garnet);
        if !executable.is_file() {
            return Err("Garnet não está instalado".into());
        }
        crate::store_release::verify_authenticode(&executable, "Microsoft Corporation")?;
        let data = self.root.join("garnet/data");
        let logs = self.root.join("garnet/logs");
        fs::create_dir_all(&data).map_err(|error| error.to_string())?;
        fs::create_dir_all(&logs).map_err(|error| error.to_string())?;
        let secret = self.secret("garnet-hub")?;
        let verifier = format!("{:x}", Sha256::digest(secret.as_bytes()));
        let acl = self.root.join("garnet/users.acl");
        if !acl.is_file() {
            write_new_file(&acl, format!("user default off\r\nuser matriz_hub on #{verifier} -@all +get +set +del +expire +ping\r\n").as_bytes())?;
        }
        let log_path = logs.join("service.log");
        let log = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
            .map_err(|error| error.to_string())?;
        let stderr = log.try_clone().map_err(|error| error.to_string())?;
        self.launch(
            InfrastructureServiceId::Garnet,
            Command::new(executable)
                .args([
                    "--bind",
                    "127.0.0.1",
                    "--port",
                    "46379",
                    "--memory",
                    "256m",
                    "--index",
                    "16m",
                    "--storage-tier",
                    "--aof",
                    "--recover",
                    "--logdir",
                ])
                .arg(&data)
                .args(["--checkpointdir"])
                .arg(&data)
                .args(["--file-logger"])
                .arg(&log_path)
                .args(["--auth", "ACL", "--acl-file"])
                .arg(acl)
                .stdin(Stdio::null())
                .stdout(Stdio::from(log))
                .stderr(Stdio::from(stderr))
                .creation_flags(0x0800_0000),
        )?;
        Ok(())
    }

    fn provision_database(&self) -> Result<(), String> {
        let psql = self.root.join("postgres/17.11/pgsql/bin/psql.exe");
        if !psql.is_file() {
            return Err("PostgreSQL não está instalado".into());
        }
        let bootstrap = self.secret("postgres-bootstrap")?;
        let schemas = [
            "core",
            "hub",
            "spot",
            "seumei",
            "contracts",
            "willdash",
            "ops",
            "pay",
        ];
        let mut sql = String::from("BEGIN;\n");
        for schema in schemas {
            let runtime = format!("matriz_{schema}_runtime");
            let migration = format!("matriz_{schema}_migration");
            let worker = format!("matriz_{schema}_worker");
            let runtime_password = self.secret(&format!("postgres-{runtime}"))?;
            let migration_password = self.secret(&format!("postgres-{migration}"))?;
            let worker_password = self.secret(&format!("postgres-{worker}"))?;
            sql.push_str(&format!(
                "DO $matriz$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{runtime}') THEN CREATE ROLE {runtime} LOGIN NOINHERIT NOBYPASSRLS PASSWORD '{runtime_password}'; ELSE ALTER ROLE {runtime} LOGIN NOINHERIT NOBYPASSRLS PASSWORD '{runtime_password}'; END IF; IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{migration}') THEN CREATE ROLE {migration} LOGIN NOINHERIT NOBYPASSRLS PASSWORD '{migration_password}'; ELSE ALTER ROLE {migration} LOGIN NOINHERIT NOBYPASSRLS PASSWORD '{migration_password}'; END IF; IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{worker}') THEN CREATE ROLE {worker} LOGIN NOINHERIT NOBYPASSRLS PASSWORD '{worker_password}'; ELSE ALTER ROLE {worker} LOGIN NOINHERIT NOBYPASSRLS PASSWORD '{worker_password}'; END IF; END $matriz$;\nCREATE SCHEMA IF NOT EXISTS {schema} AUTHORIZATION {migration};\nGRANT USAGE ON SCHEMA {schema} TO {runtime};\nGRANT USAGE ON SCHEMA {schema} TO {worker};\nALTER DEFAULT PRIVILEGES FOR ROLE {migration} IN SCHEMA {schema} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {runtime};\nALTER DEFAULT PRIVILEGES FOR ROLE {migration} IN SCHEMA {schema} GRANT USAGE, SELECT ON SEQUENCES TO {runtime};\n"
            ));
        }
        sql.push_str("COMMIT;\n");
        let mut child = Command::new(psql)
            .env("PGPASSWORD", bootstrap)
            .args([
                "--host",
                "127.0.0.1",
                "--port",
                "55432",
                "--username",
                "matriz_provisioner",
                "--dbname",
                "matriz",
                "--no-password",
                "--set",
                "ON_ERROR_STOP=1",
            ])
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .creation_flags(0x0800_0000)
            .spawn()
            .map_err(|error| error.to_string())?;
        use std::io::Write;
        child
            .stdin
            .take()
            .ok_or("Entrada segura do PostgreSQL indisponível")?
            .write_all(sql.as_bytes())
            .map_err(|error| error.to_string())?;
        let output = child
            .wait_with_output()
            .map_err(|error| error.to_string())?;
        if !output.status.success() {
            return Err(format!(
                "Provisionamento do banco falhou: {}",
                redact(&String::from_utf8_lossy(&output.stderr))
            ));
        }
        let marker = self.root.join("control/database-provisioned.json");
        if marker.exists() {
            fs::remove_file(&marker).map_err(|error| error.to_string())?;
        }
        write_new_file(&marker, br#"{"version":1,"database":"matriz","schemas":["core","hub","spot","seumei","contracts","willdash","ops","pay"]}"#)
    }

    fn create_backup(&self) -> Result<(), String> {
        let pg_dump = self.root.join("postgres/17.11/pgsql/bin/pg_dump.exe");
        if !pg_dump.is_file() {
            return Err("pg_dump portátil indisponível".into());
        }
        let backups = self.root.join("backups");
        fs::create_dir_all(&backups).map_err(|error| error.to_string())?;
        let id = format!("backup-{}", uuid::Uuid::new_v4().simple());
        let staging = backups.join(format!(".{id}.partial"));
        let final_dump = backups.join(format!("{id}.dump"));
        let status = Command::new(pg_dump)
            .env("PGPASSWORD", self.secret("postgres-bootstrap")?)
            .args([
                "--host",
                "127.0.0.1",
                "--port",
                "55432",
                "--username",
                "matriz_provisioner",
                "--dbname",
                "matriz",
                "--no-password",
                "--format",
                "custom",
                "--file",
            ])
            .arg(&staging)
            .creation_flags(0x0800_0000)
            .status()
            .map_err(|error| error.to_string())?;
        if !status.success() {
            let _ = fs::remove_file(&staging);
            return Err("O backup lógico do database matriz falhou".into());
        }
        let bytes = fs::metadata(&staging)
            .map_err(|error| error.to_string())?
            .len();
        if bytes == 0 {
            let _ = fs::remove_file(&staging);
            return Err("O backup gerado está vazio".into());
        }
        let sha256 = sha256_file(&staging)?;
        fs::rename(&staging, &final_dump).map_err(|error| error.to_string())?;
        let receipt = serde_json::to_vec(&serde_json::json!({
            "version": 1,
            "id": id,
            "fileName": final_dump.file_name().and_then(|value| value.to_str()).ok_or("Nome de backup inválido")?,
            "createdAt": current_time_millis(),
            "bytes": bytes,
            "sha256": sha256,
        })).map_err(|error| error.to_string())?;
        write_new_file(&backups.join(format!("{id}.json")), &receipt)
    }

    fn apply_workspace_migrations(&self, workspace: &Path) -> Result<(), String> {
        let workspace = workspace
            .canonicalize()
            .map_err(|error| error.to_string())?;
        let files = read_migration_files(&workspace)?;
        for schema in DATABASE_SCHEMAS {
            let ledger = compare_migration_ledger(
                files.get(*schema).map(Vec::as_slice).unwrap_or_default(),
                &self.applied_migrations(schema)?,
            )?;
            if matches!(ledger.state, "drifted" | "failed") {
                return Err(format!("O ledger {schema} está {}", ledger.state));
            }
        }
        self.create_backup()?;
        for schema in DATABASE_SCHEMAS {
            let migration_role = format!("matriz_{schema}_migration");
            let password = self.secret(&format!("postgres-{migration_role}"))?;
            let ledger_sql = format!(
                "CREATE TABLE IF NOT EXISTS \"{schema}\".\"_prisma_migrations\" (id VARCHAR(36) PRIMARY KEY NOT NULL, checksum VARCHAR(64) NOT NULL, finished_at TIMESTAMPTZ, migration_name VARCHAR(255) NOT NULL, logs TEXT, rolled_back_at TIMESTAMPTZ, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), applied_steps_count INTEGER NOT NULL DEFAULT 0);"
            );
            self.psql_as(&migration_role, &password, &ledger_sql)?;
            let applied = self.applied_migrations(schema)?;
            let applied_names: std::collections::HashSet<_> =
                applied.iter().map(|item| item.name.as_str()).collect();
            for migration in files.get(*schema).into_iter().flatten() {
                if applied_names.contains(migration.name.as_str()) {
                    continue;
                }
                if !valid_migration_name(&migration.name) {
                    return Err(format!("Nome de migration inválido em {schema}"));
                }
                let source = workspace
                    .join("prisma")
                    .join(schema)
                    .join("migrations")
                    .join(&migration.name)
                    .join("migration.sql")
                    .canonicalize()
                    .map_err(|error| error.to_string())?;
                if !source.starts_with(&workspace) {
                    return Err("Migration fora do workspace canônico recusada".into());
                }
                let mut sql = format!("SET search_path TO \"{schema}\";\n");
                let source_sql = fs::read_to_string(&source).map_err(|error| error.to_string())?;
                sql.push_str(&source_sql.replace(
                    &format!("CREATE SCHEMA IF NOT EXISTS \"{schema}\";"),
                    "-- Schema preprovisionado pelo Matriz Control.",
                ));
                let id = uuid::Uuid::new_v4();
                sql.push_str(&format!(
                    "\nINSERT INTO \"{schema}\".\"_prisma_migrations\" (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ('{id}','{}',now(),'{}',1);\n",
                    migration.checksum, migration.name
                ));
                let staging = self
                    .root
                    .join("control")
                    .join(format!(".migration-{}.sql", uuid::Uuid::new_v4().simple()));
                write_new_file(&staging, sql.as_bytes())?;
                let result = self.psql_file_as(&migration_role, &password, &staging);
                let _ = fs::remove_file(&staging);
                if let Err(error) = result {
                    let failed_id = uuid::Uuid::new_v4();
                    let failed_sql = format!(
                        "INSERT INTO \"{schema}\".\"_prisma_migrations\" (id, checksum, migration_name, logs) VALUES ('{failed_id}','{}','{}','Migration gerenciada falhou; consulte os logs sanitizados.');",
                        migration.checksum, migration.name
                    );
                    let _ = self.psql_as(&migration_role, &password, &failed_sql);
                    return Err(error);
                }
            }
        }
        Ok(())
    }

    fn psql_as(&self, username: &str, password: &str, sql: &str) -> Result<(), String> {
        let psql = self.root.join("postgres/17.11/pgsql/bin/psql.exe");
        let output = Command::new(psql)
            .env("PGPASSWORD", password)
            .args([
                "--host",
                "127.0.0.1",
                "--port",
                "55432",
                "--username",
                username,
                "--dbname",
                "matriz",
                "--no-password",
                "--set",
                "ON_ERROR_STOP=1",
                "--command",
                sql,
            ])
            .creation_flags(0x0800_0000)
            .output()
            .map_err(|error| error.to_string())?;
        if output.status.success() {
            Ok(())
        } else {
            Err(format!(
                "Operação PostgreSQL falhou: {}",
                redact(&String::from_utf8_lossy(&output.stderr))
            ))
        }
    }

    fn run_local_seed(&self, workspace: &Path) -> Result<(), String> {
        let script = workspace
            .join("tooling/scripts/seed-local-dev.ts")
            .canonicalize()
            .map_err(|_| "Script de seed local não encontrado".to_string())?;
        if !script.starts_with(workspace) {
            return Err("Script de seed fora do workspace canônico".into());
        }
        let args = vec![
            "exec".to_owned(),
            "tsx".to_owned(),
            "tooling/scripts/seed-local-dev.ts".to_owned(),
        ];
        let (program, arguments) = corepack_pnpm_command(&args)?;
        let node_directory = Path::new(&program)
            .parent()
            .ok_or("Diretório do Node.js inválido")?;
        let system_root = std::env::var_os("SystemRoot")
            .map(PathBuf::from)
            .ok_or("Diretório do Windows indisponível")?;
        let system32 = system_root.join("System32");
        let mut command = Command::new(&program);
        command
            .args(arguments)
            .current_dir(workspace)
            .env_clear()
            .env("MATRIZ_ENVIRONMENT", "local")
            .env("ComSpec", system32.join("cmd.exe"))
            .env(
                "Path",
                std::env::join_paths([node_directory, system32.as_path()])
                    .map_err(|_| "PATH interno do seed inválido")?,
            )
            .stdin(Stdio::null())
            .creation_flags(0x0800_0000);
        for key in [
            "SystemRoot",
            "WINDIR",
            "TEMP",
            "TMP",
            "LOCALAPPDATA",
            "APPDATA",
            "USERPROFILE",
            "HOMEDRIVE",
            "HOMEPATH",
            "ProgramData",
            "ProgramFiles",
            "ProgramFiles(x86)",
        ] {
            if let Some(value) = std::env::var_os(key) {
                command.env(key, value);
            }
        }
        command.env("INIT_CWD", workspace).env("PWD", workspace);
        for schema in DATABASE_SCHEMAS {
            let role = format!("matriz_{schema}_runtime");
            let password = self.secret(&format!("postgres-{role}"))?;
            command.env(
                format!("{}_DATABASE_URL", schema.to_ascii_uppercase()),
                format!("postgresql://{role}:{password}@127.0.0.1:55432/matriz?schema={schema}"),
            );
        }
        for (environment_key, secret_name) in LOCAL_OIDC_CLIENT_SECRETS {
            command.env(environment_key, self.secret(secret_name)?);
        }
        let output = command.output().map_err(|error| error.to_string())?;
        if output.status.success() {
            Ok(())
        } else {
            let detail = format!(
                "{}\n{}",
                String::from_utf8_lossy(&output.stderr),
                String::from_utf8_lossy(&output.stdout)
            );
            Err(format!("Seed local falhou: {}", redact(detail.trim())))
        }
    }

    fn read_event_diagnostics(&self) -> Result<Vec<EventQueueDiagnostic>, String> {
        let mut diagnostics = Vec::with_capacity(DATABASE_SCHEMAS.len() * 2);
        for schema in DATABASE_SCHEMAS {
            for queue in ["outbox", "inbox"] {
                let table = format!("{queue}_events");
                let relation = self
                    .psql_output(
                        "matriz",
                        &format!("SELECT to_regclass('\"{schema}\".\"{table}\"');"),
                    )?
                    .trim()
                    .to_owned();
                if relation.is_empty() {
                    diagnostics.push(EventQueueDiagnostic {
                        schema: (*schema).into(),
                        queue,
                        available: false,
                        pending: 0,
                        retries: 0,
                        dead_letters: 0,
                        oldest_at: None,
                    });
                    continue;
                }
                let sql = if queue == "outbox" {
                    format!("SELECT count(*) FILTER (WHERE \"publishedAt\" IS NULL AND \"deadLetteredAt\" IS NULL), count(*) FILTER (WHERE \"attempts\" > 0 AND \"publishedAt\" IS NULL AND \"deadLetteredAt\" IS NULL), count(*) FILTER (WHERE \"deadLetteredAt\" IS NOT NULL), COALESCE(to_char(min(\"occurredAt\") FILTER (WHERE \"publishedAt\" IS NULL AND \"deadLetteredAt\" IS NULL), 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"'),'') FROM \"{schema}\".\"{table}\";")
                } else {
                    format!("SELECT count(*), 0, 0, '' FROM \"{schema}\".\"{table}\";")
                };
                let output = self.psql_output("matriz", &sql)?;
                let fields: Vec<_> = output.trim().split('|').collect();
                if fields.len() != 4 {
                    return Err("Diagnóstico de eventos retornou dados inválidos".into());
                }
                diagnostics.push(EventQueueDiagnostic {
                    schema: (*schema).into(),
                    queue,
                    available: true,
                    pending: fields[0]
                        .parse()
                        .map_err(|_| "Contagem de eventos inválida")?,
                    retries: fields[1]
                        .parse()
                        .map_err(|_| "Contagem de retries inválida")?,
                    dead_letters: fields[2]
                        .parse()
                        .map_err(|_| "Contagem de dead letters inválida")?,
                    oldest_at: (!fields[3].is_empty()).then(|| fields[3].into()),
                });
            }
        }
        Ok(diagnostics)
    }

    fn psql_file_as(&self, username: &str, password: &str, file: &Path) -> Result<(), String> {
        let psql = self.root.join("postgres/17.11/pgsql/bin/psql.exe");
        let output = Command::new(psql)
            .env("PGPASSWORD", password)
            .args([
                "--host",
                "127.0.0.1",
                "--port",
                "55432",
                "--username",
                username,
                "--dbname",
                "matriz",
                "--no-password",
                "--set",
                "ON_ERROR_STOP=1",
                "--single-transaction",
                "--file",
            ])
            .arg(file)
            .creation_flags(0x0800_0000)
            .output()
            .map_err(|error| error.to_string())?;
        if output.status.success() {
            Ok(())
        } else {
            Err(format!(
                "Migration PostgreSQL falhou: {}",
                redact(&String::from_utf8_lossy(&output.stderr))
            ))
        }
    }

    fn psql_output(&self, database: &str, sql: &str) -> Result<String, String> {
        let psql = self.root.join("postgres/17.11/pgsql/bin/psql.exe");
        if !psql.is_file() {
            return Err("PostgreSQL não está instalado".into());
        }
        let output = Command::new(psql)
            .env("PGPASSWORD", self.secret("postgres-bootstrap")?)
            .args([
                "--host",
                "127.0.0.1",
                "--port",
                "55432",
                "--username",
                "matriz_provisioner",
                "--dbname",
                database,
                "--no-password",
                "--tuples-only",
                "--no-align",
                "--field-separator",
                "|",
                "--set",
                "ON_ERROR_STOP=1",
                "--command",
                sql,
            ])
            .creation_flags(0x0800_0000)
            .output()
            .map_err(|error| error.to_string())?;
        if !output.status.success() {
            return Err(format!(
                "Consulta PostgreSQL falhou: {}",
                redact(&String::from_utf8_lossy(&output.stderr))
            ));
        }
        String::from_utf8(output.stdout).map_err(|_| "A resposta do PostgreSQL não é UTF-8".into())
    }

    fn database_schema_count(&self, database: &str) -> Result<usize, String> {
        let quoted = DATABASE_SCHEMAS
            .iter()
            .map(|schema| format!("'{schema}'"))
            .collect::<Vec<_>>()
            .join(",");
        self.psql_output(
            database,
            &format!("SELECT count(*) FROM pg_namespace WHERE nspname IN ({quoted});"),
        )?
        .trim()
        .parse()
        .map_err(|_| "A validação dos schemas restaurados retornou um valor inválido".into())
    }

    fn run_database_tool(&self, executable: &Path, arguments: &[&str]) -> Result<(), String> {
        let output = Command::new(executable)
            .env("PGPASSWORD", self.secret("postgres-bootstrap")?)
            .args(arguments)
            .creation_flags(0x0800_0000)
            .output()
            .map_err(|error| error.to_string())?;
        if output.status.success() {
            Ok(())
        } else {
            Err(redact(&String::from_utf8_lossy(&output.stderr)))
        }
    }

    fn restore_verified_backup(&self, backup_id: &str) -> Result<(), String> {
        let dump = resolve_verified_backup(&self.root, backup_id)?;
        self.create_backup()?;
        let suffix = uuid::Uuid::new_v4().simple().to_string();
        let temporary = format!("matriz_restore_{suffix}");
        let quarantine = format!("matriz_quarantine_{suffix}");
        let failed = format!("matriz_failed_{suffix}");
        let bin = self.root.join("postgres/17.11/pgsql/bin");
        let createdb = bin.join("createdb.exe");
        let dropdb = bin.join("dropdb.exe");
        let pg_restore = bin.join("pg_restore.exe");
        for executable in [&createdb, &dropdb, &pg_restore] {
            if !executable.is_file() {
                return Err("Ferramentas portáteis de restore estão incompletas".into());
            }
        }
        self.run_database_tool(
            &createdb,
            &[
                "--host",
                "127.0.0.1",
                "--port",
                "55432",
                "--username",
                "matriz_provisioner",
                "--owner",
                "matriz_provisioner",
                "--no-password",
                &temporary,
            ],
        )?;
        let validation = self
            .run_database_tool(
                &pg_restore,
                &[
                    "--host",
                    "127.0.0.1",
                    "--port",
                    "55432",
                    "--username",
                    "matriz_provisioner",
                    "--dbname",
                    &temporary,
                    "--no-password",
                    "--exit-on-error",
                    dump.to_str().ok_or("Caminho interno do backup inválido")?,
                ],
            )
            .and_then(|_| {
                let count = self.database_schema_count(&temporary)?;
                if count == DATABASE_SCHEMAS.len() {
                    Ok(())
                } else {
                    Err("O restore temporário não contém os oito schemas esperados".into())
                }
            });
        if let Err(error) = validation {
            let _ = self.run_database_tool(
                &dropdb,
                &[
                    "--host",
                    "127.0.0.1",
                    "--port",
                    "55432",
                    "--username",
                    "matriz_provisioner",
                    "--if-exists",
                    "--force",
                    "--no-password",
                    &temporary,
                ],
            );
            return Err(error);
        }
        let swap = format!(
            "BEGIN; SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('matriz','{temporary}') AND pid <> pg_backend_pid(); ALTER DATABASE matriz RENAME TO {quarantine}; ALTER DATABASE {temporary} RENAME TO matriz; COMMIT;"
        );
        self.psql_output("postgres", &swap)?;
        verify_database_after_swap(self.database_schema_count("matriz"), || {
            let rollback = format!(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'matriz' AND pid <> pg_backend_pid(); ALTER DATABASE matriz RENAME TO {failed}; ALTER DATABASE {quarantine} RENAME TO matriz;"
            );
            self.psql_output("postgres", &rollback).map(|_| ())
        })?;
        self.run_database_tool(
            &dropdb,
            &[
                "--host",
                "127.0.0.1",
                "--port",
                "55432",
                "--username",
                "matriz_provisioner",
                "--if-exists",
                "--force",
                "--no-password",
                &quarantine,
            ],
        )
    }

    fn stop(&self, service_id: InfrastructureServiceId) -> Result<(), String> {
        let expected = self
            .executable(service_id)
            .canonicalize()
            .map_err(|error| error.to_string())?;
        let ports = service_ports(service_id);
        let listeners = ports::enumerate_listeners()?;
        let mut pids = Vec::new();
        for listener in listeners
            .iter()
            .filter(|listener| ports.contains(&listener.port))
        {
            let observed = listener
                .executable_path
                .as_deref()
                .map(PathBuf::from)
                .and_then(|path| path.canonicalize().ok());
            if observed.as_ref() != Some(&expected) {
                return Err("A porta pertence a um processo externo; parada recusada".into());
            }
            if !pids.contains(&listener.pid) {
                pids.push(listener.pid);
            }
        }
        if pids.is_empty() {
            if let Some(process) = managed_process::VerifiedProcess::recover(
                &expected,
                &self.launch_receipt(service_id),
                true,
            ) {
                self.stop_verified(service_id, process)?;
            }
            return Ok(());
        }
        let processes = pids
            .into_iter()
            .map(|pid| {
                managed_process::VerifiedProcess::open(
                    pid,
                    &expected,
                    &self.launch_receipt(service_id),
                    true,
                )
            })
            .collect::<Result<Vec<_>, _>>()?;
        for process in processes {
            self.stop_verified(service_id, process)?;
        }
        Ok(())
    }

    fn stop_verified(
        &self,
        service: InfrastructureServiceId,
        process: managed_process::VerifiedProcess,
    ) -> Result<(), String> {
        if service != InfrastructureServiceId::Postgres {
            return process.terminate();
        }
        // PostgreSQL's Windows signal pipe requests a fast, clean shutdown.
        // Keep the validated handle alive throughout the request and exit wait.
        let pg_ctl = self.root.join("postgres/17.11/pgsql/bin/pg_ctl.exe");
        let output = Command::new(pg_ctl)
            .args(["kill", "INT", &process.pid().to_string()])
            .stdin(Stdio::null())
            .creation_flags(0x0800_0000)
            .output()
            .map_err(|error| error.to_string())?;
        if !output.status.success() {
            return Err("PostgreSQL recusou o pedido de encerramento limpo".into());
        }
        process.wait_for_exit(20_000)
    }
}

impl InfrastructureHost for PortableInfrastructureHost {
    fn inspect(
        &self,
        service_id: InfrastructureServiceId,
    ) -> Result<InfrastructureInspection, String> {
        let executable = self.executable(service_id);
        let expected = executable.canonicalize().ok();
        let ports = service_ports(service_id);
        let listeners: Vec<_> = ports::enumerate_listeners()?
            .into_iter()
            .filter(|listener| ports.contains(&listener.port))
            .collect();
        let recorded = expected.as_ref().is_some_and(|expected| {
            managed_process::VerifiedProcess::recover(
                expected,
                &self.launch_receipt(service_id),
                false,
            )
            .is_some()
        });
        let running = !listeners.is_empty() || recorded;
        let owned = if running {
            expected.as_ref().is_some_and(|expected| {
                listeners.iter().all(|listener| {
                    managed_process::VerifiedProcess::open(
                        listener.pid,
                        expected,
                        &self.launch_receipt(service_id),
                        false,
                    )
                    .is_ok()
                })
            })
        } else {
            executable.is_file()
        };
        let healthy = ports
            .iter()
            .all(|port| listeners.iter().any(|listener| listener.port == *port));
        Ok(InfrastructureInspection {
            installed: executable.is_file(),
            running,
            healthy,
            owned,
            observed_version: executable
                .is_file()
                .then(|| service_version(service_id).into()),
        })
    }

    fn execute(
        &self,
        target_id: InfrastructureTargetId,
        action: InfrastructureAction,
    ) -> Result<(), String> {
        if matches!(
            action,
            InfrastructureAction::Provision
                | InfrastructureAction::Backup
                | InfrastructureAction::Restore
        ) && target_id != InfrastructureTargetId::Postgres
        {
            return Err("Operações de banco só aceitam o alvo PostgreSQL".into());
        }
        let services: Vec<_> = match target_id.service_id() {
            Some(service) => vec![service],
            None => vec![
                InfrastructureServiceId::Postgres,
                InfrastructureServiceId::Garnet,
                InfrastructureServiceId::Nats,
            ],
        };
        for service in services {
            match action {
                InfrastructureAction::Install => self.install(service)?,
                InfrastructureAction::Start => match service {
                    InfrastructureServiceId::Postgres => self.start_postgres()?,
                    InfrastructureServiceId::Garnet => self.start_garnet()?,
                    InfrastructureServiceId::Nats => self.start_nats()?,
                },
                InfrastructureAction::Stop => self.stop(service)?,
                InfrastructureAction::Restart => {
                    self.stop(service)?;
                    match service {
                        InfrastructureServiceId::Postgres => self.start_postgres()?,
                        InfrastructureServiceId::Garnet => self.start_garnet()?,
                        InfrastructureServiceId::Nats => self.start_nats()?,
                    }
                }
                InfrastructureAction::Provision => self.provision_database()?,
                InfrastructureAction::Backup => self.create_backup()?,
                InfrastructureAction::Restore => {
                    return Err("Restore exige backupId validado".into());
                }
            }
        }
        Ok(())
    }

    fn logs(&self, service_id: InfrastructureServiceId) -> Result<Vec<String>, String> {
        let path = self.root.join(match service_id {
            InfrastructureServiceId::Postgres => "postgres/logs/service.log",
            InfrastructureServiceId::Garnet => "garnet/logs/service.log",
            InfrastructureServiceId::Nats => "nats/logs/service.log",
        });
        match fs::read_to_string(path) {
            Ok(content) => Ok(content.lines().map(str::to_owned).collect()),
            Err(error) if error.kind() == io::ErrorKind::NotFound => {
                Ok(vec!["Nenhum log local disponível".into()])
            }
            Err(error) => Err(error.to_string()),
        }
    }

    fn applied_migrations(&self, schema: &str) -> Result<Vec<AppliedMigration>, String> {
        if !DATABASE_SCHEMAS.contains(&schema) {
            return Err("Schema fora do catálogo nativo".into());
        }
        let relation = format!("SELECT to_regclass('\"{schema}\".\"_prisma_migrations\"');");
        if self.psql_output("matriz", &relation)?.trim().is_empty() {
            return Ok(Vec::new());
        }
        let query = format!(
            "SELECT migration_name, checksum, CASE WHEN finished_at IS NULL THEN 0 ELSE 1 END, CASE WHEN rolled_back_at IS NULL THEN 0 ELSE 1 END FROM \"{schema}\".\"_prisma_migrations\" ORDER BY started_at;"
        );
        self.psql_output("matriz", &query)?
            .lines()
            .filter(|line| !line.trim().is_empty())
            .map(|line| {
                let fields: Vec<_> = line.split('|').collect();
                if fields.len() != 4 {
                    return Err("Ledger PostgreSQL retornou uma linha inválida".into());
                }
                Ok(AppliedMigration {
                    name: fields[0].into(),
                    checksum: fields[1].into(),
                    finished: fields[2] == "1",
                    rolled_back: fields[3] == "1",
                })
            })
            .collect()
    }

    fn validate_backup(&self, backup_id: &str) -> Result<(), String> {
        resolve_verified_backup(&self.root, backup_id).map(|_| ())
    }

    fn restore_backup(&self, backup_id: &str) -> Result<(), String> {
        self.restore_verified_backup(backup_id)
    }

    fn apply_migrations(&self, workspace: &Path) -> Result<(), String> {
        self.apply_workspace_migrations(workspace)
    }

    fn seed_local(&self, workspace: &Path) -> Result<(), String> {
        self.run_local_seed(workspace)
    }

    fn event_diagnostics(&self) -> Result<Vec<EventQueueDiagnostic>, String> {
        self.read_event_diagnostics()
    }
}

fn valid_migration_name(name: &str) -> bool {
    let bytes = name.as_bytes();
    bytes.len() > 13
        && bytes.get(12) == Some(&b'_')
        && bytes[..12].iter().all(u8::is_ascii_digit)
        && bytes[13..].iter().all(|character| {
            character.is_ascii_lowercase() || character.is_ascii_digit() || *character == b'_'
        })
}

fn download_verified(artifact: &ArtifactDefinition, destination: &Path) -> Result<(), String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(900))
        .build()
        .map_err(|error| error.to_string())?;
    let mut response = client
        .get(artifact.url)
        .send()
        .map_err(|error| error.to_string())?;
    if !response.status().is_success() || response.url().scheme() != "https" {
        return Err(format!("Download recusado: HTTP {}", response.status()));
    }
    let allowed = [
        "get.enterprisedb.com",
        "github.com",
        "release-assets.githubusercontent.com",
    ];
    if !response
        .url()
        .host_str()
        .is_some_and(|host| allowed.contains(&host))
    {
        return Err("O download foi redirecionado para um host não permitido".into());
    }
    if response
        .content_length()
        .is_some_and(|length| length != artifact.bytes)
    {
        return Err("O tamanho declarado do artefato não confere".into());
    }
    let mut file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(destination)
        .map_err(|error| error.to_string())?;
    let copied = io::copy(
        &mut Read::by_ref(&mut response).take(artifact.bytes + 1),
        &mut file,
    )
    .map_err(|error| error.to_string())?;
    if copied != artifact.bytes {
        return Err("O tamanho baixado do artefato não confere".into());
    }
    drop(file);
    let mut file = File::open(destination).map_err(|error| error.to_string())?;
    let mut digest = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = file.read(&mut buffer).map_err(|error| error.to_string())?;
        if read == 0 {
            break;
        }
        digest.update(&buffer[..read]);
    }
    let actual = format!("{:x}", digest.finalize());
    if actual != artifact.sha256 {
        return Err("O SHA-256 do artefato não confere".into());
    }
    Ok(())
}

fn write_new_file(path: &Path, contents: &[u8]) -> Result<(), String> {
    let parent = path.parent().ok_or("Destino local inválido")?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    let mut file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(path)
        .map_err(|error| error.to_string())?;
    use std::io::Write;
    file.write_all(contents)
        .map_err(|error| error.to_string())?;
    file.sync_all().map_err(|error| error.to_string())
}

fn wait_for_port(port: u16, timeout: Duration) -> Result<(), String> {
    let started = std::time::Instant::now();
    let address = SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), port);
    while started.elapsed() < timeout {
        if TcpStream::connect_timeout(&address, Duration::from_millis(250)).is_ok() {
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(200));
    }
    Err(format!(
        "O serviço não respondeu na porta {port} dentro do limite"
    ))
}

fn current_time_millis() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .try_into()
        .unwrap_or(u64::MAX)
}

fn extract_verified_zip(archive_path: &Path, destination: &Path) -> Result<(), String> {
    fs::create_dir(destination).map_err(|error| error.to_string())?;
    let file = File::open(archive_path).map_err(|error| error.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|error| error.to_string())?;
    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(|error| error.to_string())?;
        if entry
            .unix_mode()
            .is_some_and(|mode| mode & 0o170000 == 0o120000)
        {
            return Err("Links simbólicos não são aceitos em artefatos de infraestrutura".into());
        }
        let relative = entry.enclosed_name().ok_or("Archive traversal recusado")?;
        let output = destination.join(relative);
        if entry.is_dir() {
            fs::create_dir_all(&output).map_err(|error| error.to_string())?;
            continue;
        }
        if let Some(parent) = output.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        let mut target = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(output)
            .map_err(|error| error.to_string())?;
        io::copy(&mut entry, &mut target).map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn expected_in_source(service_id: InfrastructureServiceId, source: &Path) -> PathBuf {
    match service_id {
        InfrastructureServiceId::Postgres => source.join("pgsql/bin/postgres.exe"),
        InfrastructureServiceId::Garnet => source.join("Service/Garnet.worker.exe"),
        InfrastructureServiceId::Nats => source.join("nats-server.exe"),
    }
}

fn service_ports(service_id: InfrastructureServiceId) -> &'static [u16] {
    match service_id {
        InfrastructureServiceId::Postgres => &[55432],
        InfrastructureServiceId::Garnet => &[46379],
        InfrastructureServiceId::Nats => &[54222, 58222],
    }
}

fn service_version(service_id: InfrastructureServiceId) -> &'static str {
    match service_id {
        InfrastructureServiceId::Postgres => "17.11",
        InfrastructureServiceId::Garnet => "2.1.5",
        InfrastructureServiceId::Nats => "2.14.5",
    }
}

fn state(inspection: &InfrastructureInspection) -> &'static str {
    if inspection.running && !inspection.owned {
        "external_unowned"
    } else if !inspection.installed {
        "not_installed"
    } else if !inspection.running {
        "stopped"
    } else if !inspection.healthy {
        "degraded"
    } else {
        "healthy"
    }
}

fn state_message(state: &str) -> &'static str {
    match state {
        "not_installed" => "Não instalado",
        "stopped" => "Parado",
        "healthy" => "Saudável",
        "degraded" => "Em execução, mas sem health completo",
        "external_unowned" => "Porta ocupada por processo externo; somente leitura",
        _ => "Indisponível",
    }
}

fn authorize(
    snapshot: &InfrastructureSnapshot,
    target: InfrastructureTargetId,
    action: InfrastructureAction,
) -> Result<(), String> {
    if matches!(
        action,
        InfrastructureAction::Provision
            | InfrastructureAction::Backup
            | InfrastructureAction::Restore
    ) {
        let postgres = snapshot
            .services
            .iter()
            .find(|service| service.id == InfrastructureServiceId::Postgres)
            .ok_or("PostgreSQL não está no catálogo nativo")?;
        if target != InfrastructureTargetId::Postgres || postgres.state != "healthy" {
            return Err("O banco só pode ser preparado com PostgreSQL saudável".into());
        }
    }
    let selected: Vec<_> = snapshot
        .services
        .iter()
        .filter(|service| {
            target == InfrastructureTargetId::Stack || service.id == target.service_id().unwrap()
        })
        .collect();
    if selected
        .iter()
        .any(|service| service.state == "external_unowned")
    {
        return Err("A operação foi recusada porque existe um processo externo no alvo".into());
    }
    if action != InfrastructureAction::Install
        && selected
            .iter()
            .all(|service| service.state == "not_installed")
    {
        return Err("O serviço ainda não está instalado".into());
    }
    Ok(())
}

impl InfrastructureTargetId {
    fn service_id(self) -> Option<InfrastructureServiceId> {
        match self {
            Self::Stack => None,
            Self::Postgres => Some(InfrastructureServiceId::Postgres),
            Self::Garnet => Some(InfrastructureServiceId::Garnet),
            Self::Nats => Some(InfrastructureServiceId::Nats),
        }
    }
}

fn action_label(action: InfrastructureAction) -> &'static str {
    match action {
        InfrastructureAction::Install => "Instalar",
        InfrastructureAction::Start => "Iniciar",
        InfrastructureAction::Stop => "Parar",
        InfrastructureAction::Restart => "Reiniciar",
        InfrastructureAction::Provision => "Preparar",
        InfrastructureAction::Backup => "Criar backup de",
        InfrastructureAction::Restore => "Restaurar",
    }
}

fn target_label(target: InfrastructureTargetId) -> &'static str {
    match target {
        InfrastructureTargetId::Stack => "stack Matriz",
        InfrastructureTargetId::Postgres => "PostgreSQL",
        InfrastructureTargetId::Garnet => "Garnet",
        InfrastructureTargetId::Nats => "NATS JetStream",
    }
}

fn redact(line: &str) -> String {
    let mut output = line.chars().take(2_000).collect::<String>();
    if let Some(scheme) = output.find("://") {
        let credentials_start = scheme + 3;
        if let Some(at_offset) = output[credentials_start..].find('@') {
            let at = credentials_start + at_offset;
            if output[credentials_start..at].contains(':') {
                output.replace_range(credentials_start..at, "[REDACTED]");
            }
        }
    }
    output
}

fn verify_database_after_swap(
    schema_count: Result<usize, String>,
    rollback: impl FnOnce() -> Result<(), String>,
) -> Result<(), String> {
    if matches!(schema_count, Ok(count) if count == DATABASE_SCHEMAS.len()) {
        return Ok(());
    }
    // A failed verification query is also a failed restore verification. Never
    // discard the previous database or report recovery without a successful swap.
    match rollback() {
        Ok(()) => Err("A validação após a troca falhou; o database anterior foi restaurado".into()),
        Err(_) => Err("Falha na validação após a troca; a recuperação automática falhou. Os dados foram preservados e exigem recuperação manual".into()),
    }
}

fn protect_secret(secret: &[u8]) -> Result<Vec<u8>, String> {
    let input_length = u32::try_from(secret.len()).map_err(|_| "Credencial local inválida")?;
    let input = CRYPT_INTEGER_BLOB {
        cbData: input_length,
        pbData: secret.as_ptr().cast_mut(),
    };
    let mut output = CRYPT_INTEGER_BLOB::default();
    // SAFETY: DPAPI reads the bounded input during the call and allocates the output with LocalAlloc.
    let protected = unsafe {
        CryptProtectData(
            &input,
            std::ptr::null(),
            std::ptr::null(),
            std::ptr::null(),
            std::ptr::null(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
    };
    if protected == 0 || output.pbData.is_null() {
        return Err("O Windows não protegeu a credencial local".into());
    }
    // SAFETY: CryptProtectData returned a valid output buffer of cbData bytes.
    let bytes =
        unsafe { std::slice::from_raw_parts(output.pbData, output.cbData as usize) }.to_vec();
    // SAFETY: DPAPI documents that the caller releases this buffer with LocalFree.
    unsafe { LocalFree(output.pbData.cast()) };
    Ok(bytes)
}

fn unprotect_secret(protected: &[u8]) -> Result<String, String> {
    let input_length = u32::try_from(protected.len()).map_err(|_| "Credencial local inválida")?;
    let input = CRYPT_INTEGER_BLOB {
        cbData: input_length,
        pbData: protected.as_ptr().cast_mut(),
    };
    let mut output = CRYPT_INTEGER_BLOB::default();
    // SAFETY: DPAPI reads the bounded encrypted input and allocates the output with LocalAlloc.
    let unprotected = unsafe {
        CryptUnprotectData(
            &input,
            std::ptr::null_mut(),
            std::ptr::null(),
            std::ptr::null(),
            std::ptr::null(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
    };
    if unprotected == 0 || output.pbData.is_null() {
        return Err("A credencial local protegida não pôde ser recuperada".into());
    }
    // SAFETY: CryptUnprotectData returned a valid output buffer of cbData bytes.
    let bytes =
        unsafe { std::slice::from_raw_parts(output.pbData, output.cbData as usize) }.to_vec();
    // SAFETY: DPAPI documents that the caller releases this buffer with LocalFree.
    unsafe { LocalFree(output.pbData.cast()) };
    String::from_utf8(bytes).map_err(|_| "A credencial local protegida está corrompida".into())
}

#[cfg(test)]
mod portable_database_tests {
    use super::*;

    #[test]
    #[ignore = "applies real repository migrations and seed only to a temporary PostgreSQL cluster"]
    fn postgres_repository_migrations_seed_and_event_diagnostics() {
        assert!(!ports::enumerate_listeners()
            .unwrap()
            .iter()
            .any(|row| row.port == 55432));
        struct HostGuard(PortableInfrastructureHost);
        impl Drop for HostGuard {
            fn drop(&mut self) {
                let _ = self.0.stop(InfrastructureServiceId::Postgres);
            }
        }
        let root = tempfile::tempdir().unwrap();
        let fixture = HostGuard(PortableInfrastructureHost::new(root.path().to_path_buf()));
        let host = &fixture.0;
        let workspace = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../..")
            .canonicalize()
            .unwrap();
        host.install(InfrastructureServiceId::Postgres)
            .expect("install pinned PostgreSQL");
        host.start_postgres().expect("start isolated PostgreSQL");
        host.provision_database()
            .expect("provision isolated roles and schemas");
        host.apply_workspace_migrations(&workspace)
            .expect("apply real repository migrations");
        let files = read_migration_files(&workspace).unwrap();
        for schema in DATABASE_SCHEMAS {
            let applied = host.applied_migrations(schema).unwrap();
            let comparison = compare_migration_ledger(&files[*schema], &applied).unwrap();
            assert_eq!(comparison.state, "clean", "ledger {schema}");
        }
        host.run_local_seed(&workspace)
            .expect("seed through the real local-only backend");
        assert_eq!(
            host.psql_output(
                "matriz",
                "SELECT count(*) FROM core.users WHERE id = 'user-local-owner';"
            )
            .unwrap()
            .trim(),
            "1"
        );
        assert_eq!(
            host.psql_output(
                "matriz",
                "SELECT count(*) FROM spot.bands WHERE id = 'spot-band-local';"
            )
            .unwrap()
            .trim(),
            "1"
        );
        let queues = host.read_event_diagnostics().unwrap();
        assert!(queues
            .iter()
            .any(|queue| queue.schema == "hub" && queue.queue == "outbox" && queue.available));
        assert!(queues
            .iter()
            .any(|queue| queue.schema == "seumei" && queue.queue == "outbox" && queue.available));
        host.stop(InfrastructureServiceId::Postgres).unwrap();
    }

    #[test]
    fn existing_unsigned_garnet_is_not_accepted_as_installed() {
        let root = tempfile::tempdir().unwrap();
        let host = PortableInfrastructureHost::new(root.path().to_path_buf());
        let target = host.executable(InfrastructureServiceId::Garnet);
        fs::create_dir_all(target.parent().unwrap()).unwrap();
        fs::copy(std::env::current_exe().unwrap(), target).unwrap();
        assert!(host.install(InfrastructureServiceId::Garnet).is_err());
    }

    #[test]
    #[ignore = "downloads pinned Garnet and starts it only under a temporary root"]
    fn garnet_portable_requires_authentication_and_recovers_owned_process() {
        use std::io::{BufRead, BufReader, Write};
        assert!(!ports::enumerate_listeners()
            .unwrap()
            .iter()
            .any(|row| row.port == 46379));
        struct HostGuard(PortableInfrastructureHost);
        impl Drop for HostGuard {
            fn drop(&mut self) {
                let _ = self.0.stop(InfrastructureServiceId::Garnet);
            }
        }
        let root = tempfile::tempdir().unwrap();
        let fixture = HostGuard(PortableInfrastructureHost::new(root.path().to_path_buf()));
        let host = &fixture.0;
        host.install(InfrastructureServiceId::Garnet)
            .expect("install pinned signed Garnet");
        host.start_garnet().expect("start temporary Garnet");
        wait_for_port(46379, Duration::from_secs(20)).expect("Garnet readiness");
        let mut stream = TcpStream::connect("127.0.0.1:46379").unwrap();
        stream
            .set_read_timeout(Some(Duration::from_secs(5)))
            .unwrap();
        let mut reader = BufReader::new(stream.try_clone().unwrap());
        stream.write_all(b"*1\r\n$4\r\nPING\r\n").unwrap();
        let mut reply = String::new();
        reader.read_line(&mut reply).unwrap();
        assert!(
            reply.starts_with("-NOAUTH"),
            "anonymous cache access must be refused"
        );
        let password = host.secret("garnet-hub").unwrap();
        write!(
            stream,
            "*3\r\n$4\r\nAUTH\r\n$10\r\nmatriz_hub\r\n${}\r\n{}\r\n",
            password.len(),
            password
        )
        .unwrap();
        reply.clear();
        reader.read_line(&mut reply).unwrap();
        assert_eq!(reply, "+OK\r\n");
        stream.write_all(b"*1\r\n$4\r\nPING\r\n").unwrap();
        reply.clear();
        reader.read_line(&mut reply).unwrap();
        assert_eq!(reply, "+PONG\r\n");
        stream
            .write_all(b"*3\r\n$3\r\nSET\r\n$18\r\nmatriz:persistence\r\n$7\r\nhealthy\r\n")
            .unwrap();
        reply.clear();
        reader.read_line(&mut reply).unwrap();
        assert_eq!(reply, "+OK\r\n");
        drop(reader);
        drop(stream);
        let recovered = PortableInfrastructureHost::new(root.path().to_path_buf());
        assert!(
            recovered
                .inspect(InfrastructureServiceId::Garnet)
                .unwrap()
                .owned
        );
        recovered
            .stop(InfrastructureServiceId::Garnet)
            .expect("stop receipt-owned Garnet");
        host.start_garnet().expect("restart temporary Garnet");
        wait_for_port(46379, Duration::from_secs(20)).expect("Garnet restart readiness");
        let mut stream = TcpStream::connect("127.0.0.1:46379").unwrap();
        stream
            .set_read_timeout(Some(Duration::from_secs(5)))
            .unwrap();
        let mut reader = BufReader::new(stream.try_clone().unwrap());
        write!(
            stream,
            "*3\r\n$4\r\nAUTH\r\n$10\r\nmatriz_hub\r\n${}\r\n{}\r\n",
            password.len(),
            password
        )
        .unwrap();
        reply.clear();
        reader.read_line(&mut reply).unwrap();
        assert_eq!(reply, "+OK\r\n");
        stream
            .write_all(b"*2\r\n$3\r\nGET\r\n$18\r\nmatriz:persistence\r\n")
            .unwrap();
        reply.clear();
        reader.read_line(&mut reply).unwrap();
        assert_eq!(reply, "$7\r\n");
        reply.clear();
        reader.read_line(&mut reply).unwrap();
        assert_eq!(reply, "healthy\r\n");
        drop(reader);
        drop(stream);
        host.stop(InfrastructureServiceId::Garnet)
            .expect("stop restarted Garnet");
        assert!(
            !host
                .inspect(InfrastructureServiceId::Garnet)
                .unwrap()
                .running
        );
    }

    #[test]
    #[ignore = "downloads pinned PostgreSQL and mutates only its temporary cluster"]
    fn postgres_portable_migrations_backup_restore_and_recovery() {
        assert!(
            !ports::enumerate_listeners()
                .unwrap()
                .iter()
                .any(|row| row.port == 55432),
            "PostgreSQL acceptance port must be free; never use an existing server"
        );
        struct HostGuard(PortableInfrastructureHost);
        impl Drop for HostGuard {
            fn drop(&mut self) {
                let _ = self.0.stop(InfrastructureServiceId::Postgres);
            }
        }
        let root = tempfile::tempdir().unwrap();
        let fixture = HostGuard(PortableInfrastructureHost::new(root.path().to_path_buf()));
        let host = &fixture.0;
        host.install(InfrastructureServiceId::Postgres)
            .expect("install pinned PostgreSQL");
        host.start_postgres().expect("start temporary PostgreSQL");
        let recovered = PortableInfrastructureHost::new(root.path().to_path_buf());
        let state = recovered
            .inspect(InfrastructureServiceId::Postgres)
            .unwrap();
        assert!(state.running && state.healthy && state.owned);
        host.provision_database()
            .expect("provision eight local schemas");
        assert_eq!(host.database_schema_count("matriz").unwrap(), 8);
        let workspace = tempfile::tempdir().unwrap();
        for schema in DATABASE_SCHEMAS {
            let migration = workspace
                .path()
                .join("prisma")
                .join(schema)
                .join("migrations/202609030001_acceptance");
            fs::create_dir_all(&migration).unwrap();
            fs::write(migration.join("migration.sql"),
                "CREATE TABLE checkpoint (id integer PRIMARY KEY, label text NOT NULL);\nINSERT INTO checkpoint VALUES (1, 'before backup');\n").unwrap();
        }
        host.apply_workspace_migrations(workspace.path())
            .expect("apply fixture migrations with guard backup");
        for schema in DATABASE_SCHEMAS {
            let applied = host.applied_migrations(schema).unwrap();
            assert_eq!(applied.len(), 1);
            assert!(applied[0].finished);
        }
        host.create_backup().expect("create logical backup");
        let backups = read_backup_catalog(root.path()).unwrap();
        let latest = backups.iter().max_by_key(|entry| entry.created_at).unwrap();
        assert_eq!(latest.integrity, "verified");
        host.psql_output(
            "matriz",
            "UPDATE hub.checkpoint SET label = 'after backup' WHERE id = 1;",
        )
        .unwrap();
        host.restore_verified_backup(&latest.id)
            .expect("restore via temporary database");
        assert_eq!(
            host.psql_output("matriz", "SELECT label FROM hub.checkpoint WHERE id = 1;")
                .unwrap()
                .trim(),
            "before backup"
        );
        assert_eq!(host.database_schema_count("matriz").unwrap(), 8);
        host.stop(InfrastructureServiceId::Postgres)
            .expect("stop only the receipt-owned cluster");
        let control = Command::new(
            root.path()
                .join("postgres/17.11/pgsql/bin/pg_controldata.exe"),
        )
        .arg(root.path().join("postgres/data"))
        .env("LC_ALL", "C")
        .creation_flags(0x0800_0000)
        .output()
        .unwrap();
        assert!(control.status.success());
        assert!(String::from_utf8_lossy(&control.stdout)
            .lines()
            .any(|line| line.starts_with("Database cluster state:")
                && line.trim_end().ends_with("shut down")));
        assert!(
            !host
                .inspect(InfrastructureServiceId::Postgres)
                .unwrap()
                .running
        );
    }
}

#[cfg(test)]
mod ownership_tests {
    use super::*;

    #[test]
    #[ignore = "child fixture for receipt recovery"]
    fn pending_service_fixture() {
        assert_eq!(std::env::var("MATRIZ_PENDING_FIXTURE").as_deref(), Ok("1"));
        std::thread::sleep(Duration::from_secs(60));
    }

    #[test]
    fn recorded_process_without_ports_is_recovered_and_can_be_stopped() {
        struct ChildGuard(std::process::Child);
        impl Drop for ChildGuard {
            fn drop(&mut self) {
                let _ = self.0.kill();
                let _ = self.0.wait();
            }
        }
        let root = tempfile::tempdir().unwrap();
        let host = PortableInfrastructureHost::new(root.path().to_path_buf());
        let service = InfrastructureServiceId::Garnet;
        assert!(!ports::enumerate_listeners()
            .unwrap()
            .iter()
            .any(|row| row.port == 46379));
        let executable = host.executable(service);
        fs::create_dir_all(executable.parent().unwrap()).unwrap();
        fs::copy(std::env::current_exe().unwrap(), &executable).unwrap();
        let mut child = ChildGuard(
            Command::new(&executable)
                .args([
                    "--ignored",
                    "--exact",
                    "infrastructure::ownership_tests::pending_service_fixture",
                ])
                .env("MATRIZ_PENDING_FIXTURE", "1")
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .creation_flags(0x0800_0000)
                .spawn()
                .unwrap(),
        );
        managed_process::record(&child.0, &executable, &host.launch_receipt(service)).unwrap();
        let recovered = PortableInfrastructureHost::new(root.path().to_path_buf());
        let state = recovered.inspect(service).unwrap();
        assert!(state.running && state.owned && !state.healthy);
        // Refuse a duplicate launch even before the first service binds its port.
        assert!(recovered
            .launch(service, &mut Command::new(&executable))
            .is_err());
        recovered.stop(service).unwrap();
        assert!(child.0.try_wait().unwrap().is_some());
    }
}

#[cfg(test)]
mod restore_tests {
    use super::*;

    #[test]
    fn failed_post_restore_query_attempts_rollback_without_leaking_query_details() {
        let mut called = false;
        let result = verify_database_after_swap(Err("private query details".into()), || {
            called = true;
            Ok(())
        });
        assert!(called);
        let message = result.unwrap_err();
        assert!(message.contains("anterior foi restaurado"));
        assert!(!message.contains("private query details"));
    }

    #[test]
    fn failed_restore_rollback_never_claims_that_the_previous_database_was_restored() {
        let message = verify_database_after_swap(Ok(0), || Err("private rollback details".into()))
            .unwrap_err();
        assert!(message.contains("recuperação automática falhou"));
        assert!(!message.contains("anterior foi restaurado"));
        assert!(!message.contains("private rollback details"));
    }

    #[test]
    fn verified_restore_does_not_attempt_rollback() {
        let result = verify_database_after_swap(Ok(DATABASE_SCHEMAS.len()), || {
            panic!("a verified restore must not roll back")
        });
        assert!(result.is_ok());
    }
}

#[cfg(test)]
mod secret_tests {
    use super::*;

    #[test]
    fn dpapi_secret_is_not_plaintext_and_round_trips_for_the_current_user() {
        let plaintext = b"matriz-local-secret";
        let protected = protect_secret(plaintext).expect("protect secret");
        assert_ne!(protected, plaintext);
        assert_eq!(
            unprotect_secret(&protected).expect("unprotect secret"),
            "matriz-local-secret"
        );
    }
}
