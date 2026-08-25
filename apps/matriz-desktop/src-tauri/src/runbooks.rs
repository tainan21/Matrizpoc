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
    RunbookDefinition { id: "validate-environment", label: "Validar ambiente", description: "Confere o ambiente ativo e executa o Doctor.", steps: &["environment.validate", "doctor.run"] },
    RunbookDefinition { id: "recover-open", label: "Recuperar e abrir", description: "Recupera o runtime sob controle e abre sua rota principal.", steps: &["runtime.recover", "runtime.open"] },
    RunbookDefinition { id: "apply-visualize", label: "Aplicar e visualizar", description: "Valida, recupera e disponibiliza a rota principal.", steps: &["environment.validate", "runtime.recover", "preview.offer"] },
];

pub fn catalog() -> Vec<RunbookDefinition> { RUNBOOKS.to_vec() }

pub fn definition(id: &str) -> Result<RunbookDefinition, String> {
    RUNBOOKS.iter().copied().find(|item| item.id == id).ok_or_else(|| "Runbook is not in the trusted catalog".into())
}
