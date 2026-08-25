#[derive(Clone, Copy, Debug)]
pub struct AppDefinition {
    pub id: &'static str,
    pub label: &'static str,
    pub package_name: &'static str,
    pub directory: &'static str,
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

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ManagedOperationKind {
    Command,
    NativeInstall,
    NativeStart,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ManagedOperationDefinition {
    pub id: String,
    pub title: String,
    pub kind: ManagedOperationKind,
    pub program: Option<String>,
    pub args: Vec<String>,
}

const APPS: [AppDefinition; 9] = [
    AppDefinition {
        id: "matriz-hub",
        label: "Matriz Hub",
        package_name: "@matriz/app-matriz-hub",
        directory: "apps/matriz-hub",
        port: 3000,
    },
    AppDefinition {
        id: "spot",
        label: "Spot",
        package_name: "@matriz/app-spot",
        directory: "apps/spot",
        port: 3001,
    },
    AppDefinition {
        id: "matriz-admin",
        label: "Matriz Admin",
        package_name: "@matriz/app-matriz-admin",
        directory: "apps/matriz-admin",
        port: 3002,
    },
    AppDefinition {
        id: "contracts",
        label: "Contracts",
        package_name: "@matriz/app-contracts",
        directory: "apps/contracts",
        port: 3003,
    },
    AppDefinition {
        id: "willdash",
        label: "Willdash",
        package_name: "@matriz/app-willdash",
        directory: "apps/willdash",
        port: 3004,
    },
    AppDefinition {
        id: "matriz-workbench",
        label: "Workbench",
        package_name: "@matriz/app-matriz-workbench",
        directory: "apps/matriz-workbench",
        port: 3005,
    },
    AppDefinition {
        id: "sites",
        label: "Sites",
        package_name: "@matriz/app-sites",
        directory: "apps/sites",
        port: 3006,
    },
    AppDefinition {
        id: "matrizlib",
        label: "MatrizLib",
        package_name: "@matriz/app-matrizlib",
        directory: "apps/matrizlib",
        port: 3007,
    },
    AppDefinition {
        id: "seumei",
        label: "Seumei",
        package_name: "@matriz/app-seumei",
        directory: "apps/seumeiapp",
        port: 3008,
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

pub fn managed_operation(id: &str) -> Result<ManagedOperationDefinition, String> {
    if let Some(app_id) = id
        .strip_prefix("app.")
        .and_then(|value| value.strip_suffix(".web"))
    {
        let app = app_definition(app_id)?;
        return Ok(ManagedOperationDefinition {
            id: id.to_owned(),
            title: format!("{} / WEB", app.id.to_uppercase()),
            kind: ManagedOperationKind::Command,
            program: Some("pnpm.cmd".into()),
            args: ["--filter", app.package_name, "dev"]
                .map(str::to_owned)
                .into(),
        });
    }
    if let Some(gate_id) = id.strip_prefix("gate.") {
        let gate = gate_definition(gate_id)?;
        return Ok(ManagedOperationDefinition {
            id: id.to_owned(),
            title: format!("{} / GATE", gate.id.to_uppercase()),
            kind: ManagedOperationKind::Command,
            program: Some("pnpm.cmd".into()),
            args: ["run", gate.script].map(str::to_owned).into(),
        });
    }
    match id {
        "app.matriz-admin.native.build" => Ok(ManagedOperationDefinition {
            id: id.to_owned(),
            title: "MATRIZ ADMIN / BUILD".into(),
            kind: ManagedOperationKind::Command,
            program: Some("powershell.exe".into()),
            args: [
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                "apps/matriz-desktop/scripts/package-matriz-admin.ps1",
            ]
            .map(str::to_owned)
            .into(),
        }),
        "app.matriz-admin.native.install" => Ok(ManagedOperationDefinition {
            id: id.to_owned(),
            title: "MATRIZ ADMIN / INSTALL".into(),
            kind: ManagedOperationKind::NativeInstall,
            program: None,
            args: Vec::new(),
        }),
        "app.matriz-admin.native.start" => Ok(ManagedOperationDefinition {
            id: id.to_owned(),
            title: "MATRIZ ADMIN / NATIVE".into(),
            kind: ManagedOperationKind::NativeStart,
            program: None,
            args: Vec::new(),
        }),
        _ => Err(format!("Unknown managed operation: {id}")),
    }
}
