#[derive(Clone, Copy, Debug)]
pub struct AppDefinition {
    pub id: &'static str,
    pub package_name: &'static str,
    pub port: u16,
}

#[derive(Clone, Copy, Debug)]
pub struct GateDefinition {
    pub id: &'static str,
    pub script: &'static str,
}

#[derive(Clone, Copy, Debug)]
pub enum QuickTarget {
    Workspace,
    Terminal,
    Url(&'static str),
}

const APPS: [AppDefinition; 8] = [
    AppDefinition {
        id: "matriz-hub",
        package_name: "@matriz/app-matriz-hub",
        port: 3000,
    },
    AppDefinition {
        id: "spot",
        package_name: "@matriz/app-spot",
        port: 3001,
    },
    AppDefinition {
        id: "seumei",
        package_name: "@matriz/app-seumei",
        port: 3002,
    },
    AppDefinition {
        id: "contracts",
        package_name: "@matriz/app-contracts",
        port: 3003,
    },
    AppDefinition {
        id: "willdash",
        package_name: "@matriz/app-willdash",
        port: 3004,
    },
    AppDefinition {
        id: "matriz-workbench",
        package_name: "@matriz/app-matriz-workbench",
        port: 3005,
    },
    AppDefinition {
        id: "sites",
        package_name: "@matriz/app-sites",
        port: 3006,
    },
    AppDefinition {
        id: "matrizlib",
        package_name: "@matriz/app-matrizlib",
        port: 3007,
    },
];

const GATES: [GateDefinition; 4] = [
    GateDefinition {
        id: "typecheck",
        script: "typecheck",
    },
    GateDefinition {
        id: "lint",
        script: "lint",
    },
    GateDefinition {
        id: "test:smoke",
        script: "test:smoke",
    },
    GateDefinition {
        id: "prisma:validate",
        script: "prisma:validate",
    },
];

pub fn app_definition(id: &str) -> Result<AppDefinition, String> {
    APPS.iter()
        .copied()
        .find(|definition| definition.id == id)
        .ok_or_else(|| format!("Unknown Matriz app: {id}"))
}

pub fn gate_definition(id: &str) -> Result<GateDefinition, String> {
    GATES
        .iter()
        .copied()
        .find(|definition| definition.id == id)
        .ok_or_else(|| format!("Unknown validation gate: {id}"))
}

pub fn quick_target(id: &str) -> Result<QuickTarget, String> {
    match id {
        "workspace" => Ok(QuickTarget::Workspace),
        "terminal" => Ok(QuickTarget::Terminal),
        "hub" => Ok(QuickTarget::Url("http://localhost:3000")),
        "matrizlib" => Ok(QuickTarget::Url("http://localhost:3007")),
        "workbench" => Ok(QuickTarget::Url("http://localhost:3005")),
        _ => Err(format!("Unknown quick target: {id}")),
    }
}

pub fn apps() -> &'static [AppDefinition] {
    &APPS
}
