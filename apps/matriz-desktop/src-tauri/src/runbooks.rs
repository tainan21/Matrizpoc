use std::{
    collections::HashSet,
    sync::{Mutex, OnceLock},
};

use serde::Serialize;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunbookDefinition {
    pub id: &'static str,
    pub label: &'static str,
    pub description: &'static str,
    pub steps: &'static [&'static str],
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunbookStepResult {
    pub step_id: &'static str,
    pub status: &'static str,
    pub detail: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunbookTarget {
    pub app_id: String,
    pub route_path: &'static str,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunbookExecution {
    pub runbook_id: &'static str,
    pub app_id: String,
    pub status: &'static str,
    pub steps: Vec<RunbookStepResult>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target: Option<RunbookTarget>,
}

const RUNBOOKS: &[RunbookDefinition] = &[
    RunbookDefinition {
        id: "validate-environment",
        label: "Validar ambiente",
        description: "Confere o ambiente ativo e executa o Doctor.",
        steps: &["environment.validate", "doctor.run"],
    },
    RunbookDefinition {
        id: "recover-open",
        label: "Recuperar e abrir",
        description: "Recupera o runtime sob controle e abre sua rota principal.",
        steps: &["runtime.recover", "runtime.open"],
    },
    RunbookDefinition {
        id: "apply-visualize",
        label: "Validar e visualizar",
        description: "Valida o ambiente salvo, recupera e disponibiliza a rota principal.",
        steps: &["environment.validate", "runtime.recover", "preview.offer"],
    },
];

static ACTIVE_RUNBOOKS: OnceLock<Mutex<HashSet<String>>> = OnceLock::new();

pub struct RunbookGuard {
    app_id: String,
}

impl Drop for RunbookGuard {
    fn drop(&mut self) {
        if let Ok(mut active) = ACTIVE_RUNBOOKS.get_or_init(Default::default).lock() {
            active.remove(&self.app_id);
        }
    }
}

pub fn begin(app_id: &str) -> Result<RunbookGuard, String> {
    let mut active = ACTIVE_RUNBOOKS
        .get_or_init(Default::default)
        .lock()
        .map_err(|_| "Runbook lock poisoned")?;
    if !active.insert(app_id.into()) {
        return Err("A runbook is already running for this app".into());
    }
    Ok(RunbookGuard {
        app_id: app_id.into(),
    })
}

pub fn catalog() -> Vec<RunbookDefinition> {
    RUNBOOKS.to_vec()
}

pub fn definition(id: &str) -> Result<RunbookDefinition, String> {
    RUNBOOKS
        .iter()
        .copied()
        .find(|item| item.id == id)
        .ok_or_else(|| "Runbook is not in the trusted catalog".into())
}
