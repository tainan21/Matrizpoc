use std::{collections::HashMap, sync::Mutex};

use matriz_desktop_native::infrastructure::{
    InfrastructureAction, InfrastructureHost, InfrastructureInspection, InfrastructureManager,
    InfrastructurePreviewRequest, InfrastructureServiceId, InfrastructureTargetId,
};

#[derive(Default)]
struct FakeHost {
    states: Mutex<HashMap<InfrastructureServiceId, InfrastructureInspection>>,
    actions: Mutex<Vec<(InfrastructureTargetId, InfrastructureAction)>>,
}

impl InfrastructureHost for FakeHost {
    fn inspect(
        &self,
        service_id: InfrastructureServiceId,
    ) -> Result<InfrastructureInspection, String> {
        Ok(self
            .states
            .lock()
            .unwrap()
            .get(&service_id)
            .cloned()
            .unwrap_or_default())
    }

    fn execute(
        &self,
        target_id: InfrastructureTargetId,
        action: InfrastructureAction,
    ) -> Result<(), String> {
        self.actions.lock().unwrap().push((target_id, action));
        Ok(())
    }

    fn logs(&self, _service_id: InfrastructureServiceId) -> Result<Vec<String>, String> {
        Ok(vec![
            "postgresql://role:secret@127.0.0.1:55432/matriz".into()
        ])
    }
}

#[test]
fn snapshot_distinguishes_managed_and_external_services() {
    let host = FakeHost::default();
    host.states.lock().unwrap().insert(
        InfrastructureServiceId::Postgres,
        InfrastructureInspection {
            installed: true,
            running: true,
            healthy: true,
            owned: true,
            observed_version: Some("17.11".into()),
        },
    );
    host.states.lock().unwrap().insert(
        InfrastructureServiceId::Nats,
        InfrastructureInspection {
            installed: true,
            running: true,
            healthy: true,
            owned: false,
            observed_version: Some("2.14.5".into()),
        },
    );
    let manager = InfrastructureManager::new(Box::new(host), || 1_000);

    let snapshot = manager.snapshot().unwrap();
    assert_eq!(snapshot.services[0].state, "healthy");
    assert_eq!(snapshot.services[1].state, "not_installed");
    assert_eq!(snapshot.services[2].state, "external_unowned");
}

#[test]
fn confirmation_is_single_use_and_revalidates_the_revision() {
    let host = FakeHost::default();
    let manager = InfrastructureManager::new(Box::new(host), || 1_000);
    let snapshot = manager.snapshot().unwrap();
    let preview = manager
        .preview(InfrastructurePreviewRequest {
            target_id: InfrastructureTargetId::Stack,
            action_id: InfrastructureAction::Install,
            revision: snapshot.revision.clone(),
        })
        .unwrap();

    manager.confirm(&preview.confirmation_token).unwrap();
    assert!(manager
        .confirm(&preview.confirmation_token)
        .unwrap_err()
        .contains("uso único"));
    assert!(manager
        .preview(InfrastructurePreviewRequest {
            target_id: InfrastructureTargetId::Stack,
            action_id: InfrastructureAction::Install,
            revision: "stale".into(),
        })
        .unwrap_err()
        .contains("desatualizado"));
}

#[test]
fn logs_are_bounded_and_secrets_are_redacted() {
    let manager = InfrastructureManager::new(Box::new(FakeHost::default()), || 1_000);
    let logs = manager.logs(InfrastructureServiceId::Postgres).unwrap();
    assert_eq!(logs, ["postgresql://[REDACTED]@127.0.0.1:55432/matriz"]);
}
