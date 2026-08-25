use serde::Serialize;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RecoveryAction {
    Start,
    Restart,
    DiagnoseOnly,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryResult {
    pub app_id: String,
    pub status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
}

pub fn recovery_action(status: &str, ownership: &str) -> RecoveryAction {
    if ownership == "external" {
        RecoveryAction::DiagnoseOnly
    } else if status == "stopped" && ownership == "none" {
        RecoveryAction::Start
    } else {
        RecoveryAction::Restart
    }
}
