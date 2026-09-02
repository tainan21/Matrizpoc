use std::{
    collections::HashMap,
    fs::{self, File, OpenOptions},
    io::{self, Read},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{Arc, Mutex},
    time::Duration,
};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::{
    ports,
    processes::{ProcessTerminator, WindowsProcessTerminator},
};

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

#[derive(Clone)]
struct PendingAction {
    target_id: InfrastructureTargetId,
    action_id: InfrastructureAction,
    revision: String,
    expires_at: u64,
}

pub struct InfrastructureManager {
    host: Box<dyn InfrastructureHost>,
    root: String,
    now: Arc<dyn Fn() -> u64 + Send + Sync>,
    pending: Mutex<HashMap<String, PendingAction>>,
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
        self.host.execute(pending.target_id, pending.action_id)?;
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
        let log = OpenOptions::new()
            .create(true)
            .append(true)
            .open(logs.join("service.log"))
            .map_err(|error| error.to_string())?;
        let stderr = log.try_clone().map_err(|error| error.to_string())?;
        Command::new(executable)
            .args([
                "--jetstream",
                "--addr",
                "127.0.0.1",
                "--port",
                "54222",
                "--http_port",
                "58222",
                "--store_dir",
            ])
            .arg(data)
            .stdin(Stdio::null())
            .stdout(Stdio::from(log))
            .stderr(Stdio::from(stderr))
            .creation_flags(0x0800_0000)
            .spawn()
            .map_err(|error| error.to_string())?;
        Ok(())
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
        for pid in pids {
            WindowsProcessTerminator.terminate(pid)?;
        }
        Ok(())
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
        let running = !listeners.is_empty();
        let owned = if running {
            expected.as_ref().is_some_and(|expected| {
                listeners.iter().all(|listener| {
                    listener
                        .executable_path
                        .as_deref()
                        .map(PathBuf::from)
                        .and_then(|path| path.canonicalize().ok())
                        .as_ref()
                        == Some(expected)
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
        let services: Vec<_> = match target_id.service_id() {
            Some(service) => vec![service],
            None => vec![
                InfrastructureServiceId::Postgres,
                InfrastructureServiceId::Garnet,
                InfrastructureServiceId::Nats,
            ],
        };
        if action != InfrastructureAction::Install
            && services
                .iter()
                .any(|service| *service != InfrastructureServiceId::Nats)
        {
            return Err(
                "O lifecycle autenticado de PostgreSQL e Garnet ainda não foi habilitado".into(),
            );
        }
        for service in services {
            match action {
                InfrastructureAction::Install => self.install(service)?,
                InfrastructureAction::Start => self.start_nats()?,
                InfrastructureAction::Stop => self.stop(service)?,
                InfrastructureAction::Restart => {
                    self.stop(service)?;
                    self.start_nats()?;
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
