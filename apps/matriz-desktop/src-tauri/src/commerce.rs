use std::{
    collections::{BTreeMap, HashSet},
    fs,
    path::PathBuf,
    sync::{Arc, Mutex},
};

use serde::{Deserialize, Serialize};

const VERSION: u32 = 1;

#[derive(Clone, Debug)]
pub struct CommerceStore {
    path: PathBuf,
    lock: Arc<Mutex<()>>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommerceSnapshot {
    pub wallet: WalletView,
    pub packages: Vec<PackageView>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum PackageActivationTarget {
    Runtime {
        package_id: String,
        app_id: String,
        operation_id: String,
        route_path: String,
    },
    Control {
        package_id: String,
        view: String,
        feature_id: String,
    },
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WalletView {
    pub balance: i64,
    pub currency: &'static str,
    pub transactions: Vec<Transaction>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageView {
    pub id: &'static str,
    pub name: &'static str,
    pub description: &'static str,
    pub developer: &'static str,
    pub version: &'static str,
    pub category: &'static str,
    pub app_id: &'static str,
    pub price: i64,
    pub permissions: &'static [&'static str],
    pub compatibility: &'static str,
    pub owned: bool,
    pub installed: bool,
    pub trust_status: &'static str,
    pub built_in: bool,
    pub status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub receipt: Option<InstallReceipt>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallReceipt {
    pub package_id: String,
    pub version: String,
    pub manifest_digest: String,
    pub granted_permissions: Vec<String>,
    pub installed_at: u128,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Transaction {
    pub id: String,
    pub occurred_at: u128,
    pub amount: i64,
    pub kind: String,
    pub title: String,
    pub package_id: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct State {
    version: u32,
    transactions: Vec<Transaction>,
    owned: Vec<String>,
    installed: BTreeMap<String, String>,
    #[serde(default)]
    receipts: BTreeMap<String, InstallReceipt>,
}

#[derive(Clone, Copy)]
struct CatalogPackage {
    id: &'static str,
    name: &'static str,
    description: &'static str,
    version: &'static str,
    category: &'static str,
    app_id: &'static str,
    price: i64,
    permissions: &'static [&'static str],
}

const CATALOG: &[CatalogPackage] = &[
    CatalogPackage {
        id: "matriz.analytics",
        name: "Matriz Analytics",
        description: "Dashboards e análise operacional do ecossistema.",
        version: "1.2.0",
        category: "Analytics",
        app_id: "willdash",
        price: 220,
        permissions: &["runtime:observe", "activity:read"],
    },
    CatalogPackage {
        id: "matriz.agent-pack",
        name: "AI Agent Pack",
        description: "Capacidades assistivas para workflows controlados.",
        version: "1.0.0",
        category: "Agents",
        app_id: "matriz-workbench",
        price: 200,
        permissions: &["activity:read", "actions:request"],
    },
    CatalogPackage {
        id: "matriz.components",
        name: "Matriz Components",
        description: "Catálogo visual, tokens e playground do MatrizLib.",
        version: "0.1.0",
        category: "Components",
        app_id: "matrizlib",
        price: 0,
        permissions: &["runtime:start"],
    },
    CatalogPackage {
        id: "matriz.admin-tools",
        name: "Admin Tools",
        description: "Ferramentas operacionais para Matriz Admin.",
        version: "1.1.0",
        category: "Developer Tools",
        app_id: "matriz-admin",
        price: 250,
        permissions: &["runtime:start", "workspace:read"],
    },
    CatalogPackage {
        id: "matriz.node-sweep",
        name: "Node Sweep",
        description: "Limpeza segura de dependências antigas em apps registrados.",
        version: "1.0.0",
        category: "Core Utility",
        app_id: "matriz-desktop",
        price: 0,
        permissions: &[],
    },
    CatalogPackage {
        id: "matriz.system-pulse",
        name: "System Pulse",
        description: "Telemetria leve de CPU, memória, disco e Windows.",
        version: "1.0.0",
        category: "Core Utility",
        app_id: "matriz-desktop",
        price: 0,
        permissions: &[],
    },
    CatalogPackage {
        id: "matriz.awake",
        name: "Matriz Awake",
        description: "Mantém o PC acordado enquanto o Control permanece ativo.",
        version: "1.0.0",
        category: "Core Utility",
        app_id: "matriz-desktop",
        price: 0,
        permissions: &[],
    },
    CatalogPackage {
        id: "matriz.resume-session",
        name: "Resume Session",
        description: "Retoma o último contexto leve da interface local.",
        version: "1.0.0",
        category: "Core Utility",
        app_id: "matriz-desktop",
        price: 0,
        permissions: &[],
    },
];

impl CommerceStore {
    pub fn new(path: PathBuf) -> Self {
        Self {
            path,
            lock: Arc::new(Mutex::new(())),
        }
    }

    pub fn snapshot(&self) -> Result<CommerceSnapshot, String> {
        let _guard = self.lock.lock().map_err(|_| "Commerce lock poisoned")?;
        self.snapshot_unlocked()
    }

    pub fn acquire(&self, package_id: &str) -> Result<CommerceSnapshot, String> {
        catalog(package_id)?;
        Err("Store commerce is read-only; local runtimes do not require acquisition".into())
    }

    pub fn install(
        &self,
        package_id: &str,
        granted_permissions: &[&str],
    ) -> Result<CommerceSnapshot, String> {
        let _ = granted_permissions;
        catalog(package_id)?;
        Err("Store commerce is read-only; installation requires a verified release".into())
    }

    pub fn repair(&self, package_id: &str) -> Result<CommerceSnapshot, String> {
        catalog(package_id)?;
        Err("Store commerce is read-only; repair requires a verified release".into())
    }

    pub fn uninstall(&self, package_id: &str) -> Result<CommerceSnapshot, String> {
        catalog(package_id)?;
        Err("Store commerce is read-only; removal requires an installed desktop product".into())
    }

    pub fn activate(&self, package_id: &str) -> Result<PackageActivationTarget, String> {
        let _guard = self.lock.lock().map_err(|_| "Commerce lock poisoned")?;
        let package = catalog(package_id)?;
        if let Some(feature_id) = builtin_feature(package) {
            return Ok(PackageActivationTarget::Control {
                package_id: package.id.into(),
                view: "hub".into(),
                feature_id: feature_id.into(),
            });
        }
        let operation_id = format!("app.{}.web", package.app_id);
        crate::catalog::managed_operation(&operation_id)?;
        Ok(PackageActivationTarget::Runtime {
            package_id: package.id.into(),
            app_id: package.app_id.into(),
            operation_id,
            route_path: "/".into(),
        })
    }

    fn snapshot_unlocked(&self) -> Result<CommerceSnapshot, String> {
        self.read().map(snapshot_from)
    }
    fn read(&self) -> Result<State, String> {
        if !self.path.exists() {
            return Ok(default_state());
        }
        let bytes = fs::read(&self.path)
            .map_err(|error| format!("Could not read commerce state: {error}"))?;
        let state: State = serde_json::from_slice(&bytes)
            .map_err(|error| format!("Commerce state is invalid: {error}"))?;
        if state.version != VERSION {
            return Err("Commerce state version is unsupported".into());
        }
        validate_state(&state)?;
        Ok(state)
    }
}

fn default_state() -> State {
    State {
        version: VERSION,
        transactions: vec![],
        owned: vec![],
        installed: BTreeMap::new(),
        receipts: BTreeMap::new(),
    }
}
fn catalog(id: &str) -> Result<CatalogPackage, String> {
    CATALOG
        .iter()
        .copied()
        .find(|package| package.id == id)
        .ok_or_else(|| "Package is not in the trusted Matriz catalog".into())
}
fn builtin_feature(package: CatalogPackage) -> Option<&'static str> {
    match package.id {
        "matriz.node-sweep" => Some("node-sweep"),
        "matriz.system-pulse" => Some("system-pulse"),
        "matriz.awake" => Some("matriz-awake"),
        "matriz.resume-session" => Some("resume-session"),
        _ => None,
    }
}
fn validate_state(state: &State) -> Result<i64, String> {
    let mut transaction_ids = HashSet::new();
    let mut acquired = HashSet::new();
    let mut grants = 0;
    let mut balance = 0_i64;
    for item in &state.transactions {
        if !transaction_ids.insert(item.id.as_str()) {
            return Err("Commerce ledger contains duplicate transaction IDs".into());
        }
        balance = balance
            .checked_add(item.amount)
            .ok_or("Commerce ledger balance overflow")?;
        match item.kind.as_str() {
            "grant" => {
                grants += 1;
                if item.amount != 1_250 || item.package_id.is_some() {
                    return Err("Commerce opening grant is invalid".into());
                }
            }
            "acquisition" | "free-acquisition" => {
                let package_id = item
                    .package_id
                    .as_deref()
                    .ok_or("Acquisition is missing package ID")?;
                let package = catalog(package_id)?;
                let expected_kind = if package.price == 0 {
                    "free-acquisition"
                } else {
                    "acquisition"
                };
                if item.kind != expected_kind || item.amount != -package.price {
                    return Err("Acquisition does not match the trusted catalog".into());
                }
                if !acquired.insert(package_id) {
                    return Err("Package was acquired more than once".into());
                }
            }
            _ => return Err("Commerce ledger contains an unsupported transaction".into()),
        }
    }
    if grants > 1 || balance < 0 {
        return Err("Commerce ledger invariants failed".into());
    }
    let owned = state
        .owned
        .iter()
        .map(String::as_str)
        .collect::<HashSet<_>>();
    if owned.len() != state.owned.len() || owned != acquired {
        return Err("Commerce ownership does not match acquisitions".into());
    }
    for (package_id, version) in &state.installed {
        catalog(package_id)?;
        if !owned.contains(package_id.as_str()) || version.is_empty() {
            return Err("Installed package does not match ownership".into());
        }
    }
    for (package_id, receipt) in &state.receipts {
        catalog(package_id)?;
        if !state.installed.contains_key(package_id) || receipt.package_id.is_empty() {
            return Err("Package receipt is not attached to an installed package".into());
        }
    }
    Ok(balance)
}
fn snapshot_from(state: State) -> CommerceSnapshot {
    let balance = state.transactions.iter().map(|item| item.amount).sum();
    let packages = CATALOG
        .iter()
        .map(|package| {
            let built_in = builtin_feature(*package).is_some();
            let local_runtime = !built_in;
            let receipt = None;
            let trust_status = "verified";
            PackageView {
                id: package.id,
                name: package.name,
                description: package.description,
                developer: if built_in { "Matriz" } else { "Matriz Team" },
                version: package.version,
                category: package.category,
                app_id: package.app_id,
                price: package.price,
                permissions: package.permissions,
                compatibility: "Matriz Control 1.0+ · Windows 10/11",
                owned: built_in || local_runtime,
                installed: built_in || local_runtime,
                trust_status,
                built_in,
                status: if built_in {
                    "Built-in / Enabled"
                } else if local_runtime {
                    "Installed / Local Runtime"
                } else {
                    "Catalog"
                },
                receipt,
            }
        })
        .collect();
    CommerceSnapshot {
        wallet: WalletView {
            balance,
            currency: "M",
            transactions: state.transactions.into_iter().rev().collect(),
        },
        packages,
    }
}
