use std::{
    collections::{BTreeMap, HashSet},
    fs,
    path::PathBuf,
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;

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
#[serde(rename_all = "camelCase")]
pub struct PackageActivationTarget {
    pub package_id: String,
    pub app_id: String,
    pub operation_id: String,
    pub route_path: String,
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
        let _guard = self.lock.lock().map_err(|_| "Commerce lock poisoned")?;
        let package = catalog(package_id)?;
        let mut state = self.read()?;
        if state.owned.iter().any(|id| id == package_id) {
            return Err("Package is already owned".into());
        }
        let balance = validate_state(&state)?;
        if balance < package.price {
            return Err("Insufficient Matriz Credits".into());
        }
        state.owned.push(package_id.into());
        state.transactions.push(transaction(
            -package.price,
            if package.price == 0 {
                "free-acquisition"
            } else {
                "acquisition"
            },
            package.name,
            Some(package_id),
        ));
        self.write(&state)?;
        Ok(snapshot_from(state))
    }

    pub fn install(
        &self,
        package_id: &str,
        granted_permissions: &[&str],
    ) -> Result<CommerceSnapshot, String> {
        let _guard = self.lock.lock().map_err(|_| "Commerce lock poisoned")?;
        let package = catalog(package_id)?;
        validate_permissions(package, granted_permissions)?;
        let mut state = self.read()?;
        if !state.owned.iter().any(|id| id == package_id) {
            return Err("Package must be acquired before installation".into());
        }
        state
            .installed
            .insert(package_id.into(), package.version.into());
        state
            .receipts
            .insert(package_id.into(), install_receipt(package));
        self.write(&state)?;
        Ok(snapshot_from(state))
    }

    pub fn repair(&self, package_id: &str) -> Result<CommerceSnapshot, String> {
        let _guard = self.lock.lock().map_err(|_| "Commerce lock poisoned")?;
        let package = catalog(package_id)?;
        let mut state = self.read()?;
        if !state.owned.iter().any(|id| id == package_id)
            || !state.installed.contains_key(package_id)
        {
            return Err("Only an installed owned package can be repaired".into());
        }
        state
            .installed
            .insert(package_id.into(), package.version.into());
        state
            .receipts
            .insert(package_id.into(), install_receipt(package));
        self.write(&state)?;
        Ok(snapshot_from(state))
    }

    pub fn uninstall(&self, package_id: &str) -> Result<CommerceSnapshot, String> {
        let _guard = self.lock.lock().map_err(|_| "Commerce lock poisoned")?;
        catalog(package_id)?;
        let mut state = self.read()?;
        if state.installed.remove(package_id).is_none() {
            return Err("Package is not installed".into());
        }
        state.receipts.remove(package_id);
        self.write(&state)?;
        Ok(snapshot_from(state))
    }

    pub fn activate(&self, package_id: &str) -> Result<PackageActivationTarget, String> {
        let _guard = self.lock.lock().map_err(|_| "Commerce lock poisoned")?;
        let package = catalog(package_id)?;
        let state = self.read()?;
        if !state.installed.contains_key(package_id) {
            return Err("Package must be installed before activation".into());
        }
        if !installation_is_verified(package, &state) {
            return Err("Package trust must be repaired before activation".into());
        }
        let operation_id = format!("app.{}.web", package.app_id);
        crate::catalog::managed_operation(&operation_id)?;
        Ok(PackageActivationTarget {
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
    fn write(&self, state: &State) -> Result<(), String> {
        validate_state(state)?;
        let parent = self.path.parent().ok_or("Commerce path has no parent")?;
        fs::create_dir_all(parent)
            .map_err(|error| format!("Could not create commerce directory: {error}"))?;
        let temp = parent.join(format!("commerce-{}.tmp", Uuid::new_v4()));
        fs::write(
            &temp,
            serde_json::to_vec_pretty(state).map_err(|error| error.to_string())?,
        )
        .map_err(|error| format!("Could not write commerce state: {error}"))?;
        fs::rename(temp, &self.path)
            .map_err(|error| format!("Could not commit commerce state: {error}"))
    }
}

fn default_state() -> State {
    State {
        version: VERSION,
        transactions: vec![transaction(1_250, "grant", "Créditos iniciais", None)],
        owned: vec![],
        installed: BTreeMap::new(),
        receipts: BTreeMap::new(),
    }
}
fn transaction(amount: i64, kind: &str, title: &str, package_id: Option<&str>) -> Transaction {
    Transaction {
        id: Uuid::new_v4().to_string(),
        occurred_at: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis(),
        amount,
        kind: kind.into(),
        title: title.into(),
        package_id: package_id.map(str::to_owned),
    }
}
fn catalog(id: &str) -> Result<CatalogPackage, String> {
    CATALOG
        .iter()
        .copied()
        .find(|package| package.id == id)
        .ok_or_else(|| "Package is not in the trusted Matriz catalog".into())
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
    if grants != 1 || balance < 0 {
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
            let receipt = state.receipts.get(package.id).cloned();
            let trust_status = if !state.installed.contains_key(package.id) {
                "missing"
            } else if installation_is_verified(*package, &state) {
                "verified"
            } else if receipt.is_some() {
                "changed"
            } else {
                "missing"
            };
            PackageView {
                id: package.id,
                name: package.name,
                description: package.description,
                developer: "Matriz Team",
                version: package.version,
                category: package.category,
                app_id: package.app_id,
                price: package.price,
                permissions: package.permissions,
                compatibility: "Matriz Control 0.1+ · Windows 10/11",
                owned: state.owned.iter().any(|id| id == package.id),
                installed: state.installed.contains_key(package.id),
                trust_status,
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

fn receipt_is_verified(package: CatalogPackage, receipt: &InstallReceipt) -> bool {
    let mut expected_permissions = package.permissions.to_vec();
    expected_permissions.sort_unstable();
    receipt.package_id == package.id
        && receipt.version == package.version
        && receipt.manifest_digest == manifest_digest(package)
        && receipt
            .granted_permissions
            .iter()
            .map(String::as_str)
            .collect::<Vec<_>>()
            == expected_permissions
}

fn installation_is_verified(package: CatalogPackage, state: &State) -> bool {
    state
        .installed
        .get(package.id)
        .is_some_and(|version| version == package.version)
        && state
            .receipts
            .get(package.id)
            .is_some_and(|receipt| receipt_is_verified(package, receipt))
}

fn validate_permissions(package: CatalogPackage, granted: &[&str]) -> Result<(), String> {
    let mut expected = package.permissions.to_vec();
    let mut actual = granted.to_vec();
    expected.sort_unstable();
    actual.sort_unstable();
    actual.dedup();
    if actual != expected {
        return Err("Granted permissions must exactly match the trusted package manifest".into());
    }
    Ok(())
}

fn manifest_digest(package: CatalogPackage) -> String {
    let mut permissions = package.permissions.to_vec();
    permissions.sort_unstable();
    let canonical = format!(
        "{}\n{}\n{}\n{}\n{}",
        package.id,
        package.name,
        package.version,
        package.app_id,
        permissions.join("\n")
    );
    format!("{:x}", Sha256::digest(canonical.as_bytes()))
}

fn install_receipt(package: CatalogPackage) -> InstallReceipt {
    let mut granted_permissions = package
        .permissions
        .iter()
        .map(|value| (*value).to_string())
        .collect::<Vec<_>>();
    granted_permissions.sort();
    InstallReceipt {
        package_id: package.id.into(),
        version: package.version.into(),
        manifest_digest: manifest_digest(package),
        granted_permissions,
        installed_at: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis(),
    }
}
