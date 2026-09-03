use std::{
    collections::HashMap,
    path::Path,
    sync::{Arc, Mutex},
};

use matriz_desktop_native::infrastructure::{
    compare_migration_ledger, read_backup_catalog, read_migration_files, resolve_verified_backup,
    AppliedMigration, EventQueueDiagnostic, InfrastructureAction, InfrastructureHost,
    InfrastructureInspection, InfrastructureManager, InfrastructurePreviewRequest,
    InfrastructureServiceId, InfrastructureTargetId, MigrationFileDigest,
    PortableInfrastructureHost,
};
use sha2::Digest;

#[derive(Default)]
struct FakeHost {
    states: Mutex<HashMap<InfrastructureServiceId, InfrastructureInspection>>,
    actions: Mutex<Vec<(InfrastructureTargetId, InfrastructureAction)>>,
    restores: Mutex<Vec<String>>,
    applied: Mutex<HashMap<String, Vec<AppliedMigration>>>,
    database_events: Arc<Mutex<Vec<&'static str>>>,
    diagnostics: Mutex<Vec<EventQueueDiagnostic>>,
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

    fn validate_backup(&self, backup_id: &str) -> Result<(), String> {
        if backup_id.starts_with("backup-") && !backup_id.contains(['/', '\\']) {
            Ok(())
        } else {
            Err("backupId inválido".into())
        }
    }

    fn restore_backup(&self, backup_id: &str) -> Result<(), String> {
        self.restores.lock().unwrap().push(backup_id.into());
        Ok(())
    }

    fn applied_migrations(&self, schema: &str) -> Result<Vec<AppliedMigration>, String> {
        Ok(self
            .applied
            .lock()
            .unwrap()
            .get(schema)
            .cloned()
            .unwrap_or_default())
    }

    fn apply_migrations(&self, workspace: &Path) -> Result<(), String> {
        self.database_events
            .lock()
            .unwrap()
            .extend(["backup", "apply"]);
        let files = read_migration_files(workspace)?;
        let mut applied = self.applied.lock().unwrap();
        for (schema, migrations) in files {
            applied.insert(
                schema,
                migrations
                    .into_iter()
                    .map(|migration| AppliedMigration {
                        name: migration.name,
                        checksum: migration.checksum,
                        finished: true,
                        rolled_back: false,
                    })
                    .collect(),
            );
        }
        Ok(())
    }

    fn seed_local(&self, _workspace: &Path) -> Result<(), String> {
        self.database_events.lock().unwrap().push("seed");
        Ok(())
    }

    fn event_diagnostics(&self) -> Result<Vec<EventQueueDiagnostic>, String> {
        Ok(self.diagnostics.lock().unwrap().clone())
    }
}

fn healthy_host(events: Arc<Mutex<Vec<&'static str>>>) -> FakeHost {
    let host = FakeHost {
        database_events: events,
        ..Default::default()
    };
    for service in [
        InfrastructureServiceId::Postgres,
        InfrastructureServiceId::Garnet,
        InfrastructureServiceId::Nats,
    ] {
        host.states.lock().unwrap().insert(
            service,
            InfrastructureInspection {
                installed: true,
                running: true,
                healthy: true,
                owned: true,
                observed_version: Some("test".into()),
            },
        );
    }
    host
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
            backup_id: None,
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
            backup_id: None,
        })
        .unwrap_err()
        .contains("desatualizado"));
}

#[test]
fn database_provisioning_requires_the_healthy_postgres_catalog_target() {
    let manager = InfrastructureManager::new(Box::new(FakeHost::default()), || 1_000);
    let snapshot = manager.snapshot().unwrap();
    let error = manager
        .preview(InfrastructurePreviewRequest {
            target_id: InfrastructureTargetId::Nats,
            action_id: InfrastructureAction::Provision,
            revision: snapshot.revision,
            backup_id: None,
        })
        .unwrap_err();
    assert!(error.contains("PostgreSQL saudável"));
}

#[test]
fn restore_accepts_only_an_opaque_backup_id_and_requires_confirmation() {
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
    let manager = InfrastructureManager::new(Box::new(host), || 1_000);
    let snapshot = manager.snapshot().unwrap();
    let error = manager
        .preview(InfrastructurePreviewRequest {
            target_id: InfrastructureTargetId::Postgres,
            action_id: InfrastructureAction::Restore,
            revision: snapshot.revision.clone(),
            backup_id: Some(r"C:\backups\matriz.dump".into()),
        })
        .unwrap_err();
    assert!(error.contains("backupId inválido"));

    let preview = manager
        .preview(InfrastructurePreviewRequest {
            target_id: InfrastructureTargetId::Postgres,
            action_id: InfrastructureAction::Restore,
            revision: snapshot.revision,
            backup_id: Some("backup-safe".into()),
        })
        .unwrap();
    assert_eq!(preview.action_id, InfrastructureAction::Restore);
    manager.confirm(&preview.confirmation_token).unwrap();
    assert!(manager
        .confirm(&preview.confirmation_token)
        .unwrap_err()
        .contains("uso único"));
}

#[test]
fn migration_ledger_detects_pending_drift_and_failed_rows() {
    let files = vec![
        MigrationFileDigest {
            name: "001_base".into(),
            checksum: "aaa".into(),
        },
        MigrationFileDigest {
            name: "002_rls".into(),
            checksum: "bbb".into(),
        },
    ];
    let applied = vec![
        AppliedMigration {
            name: "001_base".into(),
            checksum: "aaa".into(),
            finished: true,
            rolled_back: false,
        },
        AppliedMigration {
            name: "999_manual".into(),
            checksum: "ccc".into(),
            finished: true,
            rolled_back: false,
        },
    ];
    let comparison = compare_migration_ledger(&files, &applied).expect("compare ledger");
    assert_eq!(comparison.state, "drifted");
    assert_eq!(comparison.pending, ["002_rls"]);
    assert_eq!(comparison.unexpected, ["999_manual"]);

    let failed = compare_migration_ledger(
        &files,
        &[AppliedMigration {
            name: "001_base".into(),
            checksum: "aaa".into(),
            finished: false,
            rolled_back: false,
        }],
    )
    .expect("compare failed ledger");
    assert_eq!(failed.state, "failed");
    assert_eq!(failed.failed, ["001_base"]);
}

#[test]
fn migration_ledger_rejects_duplicate_names() {
    let duplicate = vec![
        MigrationFileDigest {
            name: "001".into(),
            checksum: "aaa".into(),
        },
        MigrationFileDigest {
            name: "001".into(),
            checksum: "bbb".into(),
        },
    ];
    assert!(compare_migration_ledger(&duplicate, &[])
        .unwrap_err()
        .contains("duplicad"));
}

#[test]
fn migration_application_revalidates_the_plan_and_backs_up_before_apply() {
    let workspace = tempfile::tempdir().unwrap();
    let migration = workspace
        .path()
        .join("prisma/core/migrations/202609020001_base");
    std::fs::create_dir_all(&migration).unwrap();
    std::fs::write(migration.join("migration.sql"), "SELECT 1;\n").unwrap();
    let events = Arc::new(Mutex::new(Vec::new()));
    let host = FakeHost {
        database_events: Arc::clone(&events),
        ..Default::default()
    };
    let manager = InfrastructureManager::new(Box::new(host), || 1_000);
    let preview = manager.preview_migrations(workspace.path()).unwrap();
    assert_eq!(preview.schemas, ["core"]);
    let result = manager
        .confirm_migrations(&preview.confirmation_token, workspace.path())
        .unwrap();
    assert_eq!(result.state, "clean");
    assert_eq!(*events.lock().unwrap(), ["backup", "apply"]);
    assert!(manager
        .confirm_migrations(&preview.confirmation_token, workspace.path())
        .unwrap_err()
        .contains("já utilizado"));
}

#[test]
fn migration_confirmation_rejects_a_changed_plan() {
    let workspace = tempfile::tempdir().unwrap();
    let migration = workspace
        .path()
        .join("prisma/core/migrations/202609020001_base");
    std::fs::create_dir_all(&migration).unwrap();
    std::fs::write(migration.join("migration.sql"), "SELECT 1;\n").unwrap();
    let manager = InfrastructureManager::new(Box::new(FakeHost::default()), || 1_000);
    let preview = manager.preview_migrations(workspace.path()).unwrap();
    std::fs::write(migration.join("migration.sql"), "SELECT 2;\n").unwrap();
    assert!(manager
        .confirm_migrations(&preview.confirmation_token, workspace.path())
        .unwrap_err()
        .contains("plano"));
}

#[test]
fn local_seed_requires_healthy_services_clean_ledgers_and_confirmation() {
    let workspace = tempfile::tempdir().unwrap();
    let script = workspace.path().join("tooling/scripts/seed-local-dev.ts");
    std::fs::create_dir_all(script.parent().unwrap()).unwrap();
    std::fs::write(&script, "seed();\n").unwrap();
    let events = Arc::new(Mutex::new(Vec::new()));
    let manager = InfrastructureManager::new(Box::new(healthy_host(Arc::clone(&events))), || 1_000);
    let preview = manager.preview_seed(workspace.path()).unwrap();
    assert!(events.lock().unwrap().is_empty());
    manager
        .confirm_seed(&preview.confirmation_token, workspace.path())
        .unwrap();
    assert_eq!(*events.lock().unwrap(), ["seed"]);
    assert!(manager
        .confirm_seed(&preview.confirmation_token, workspace.path())
        .unwrap_err()
        .contains("já utilizado"));
}

#[test]
fn local_seed_rejects_an_unhealthy_stack_and_a_changed_script() {
    let workspace = tempfile::tempdir().unwrap();
    let script = workspace.path().join("tooling/scripts/seed-local-dev.ts");
    std::fs::create_dir_all(script.parent().unwrap()).unwrap();
    std::fs::write(&script, "seed();\n").unwrap();
    let blocked = InfrastructureManager::new(Box::new(FakeHost::default()), || 1_000);
    assert!(blocked
        .preview_seed(workspace.path())
        .unwrap_err()
        .contains("saudável"));

    let manager = InfrastructureManager::new(
        Box::new(healthy_host(Arc::new(Mutex::new(Vec::new())))),
        || 1_000,
    );
    let preview = manager.preview_seed(workspace.path()).unwrap();
    std::fs::write(script, "changed();\n").unwrap();
    assert!(manager
        .confirm_seed(&preview.confirmation_token, workspace.path())
        .unwrap_err()
        .contains("plano"));
}

#[test]
fn event_diagnostics_are_read_only_view_models_without_payloads() {
    let host = FakeHost::default();
    host.diagnostics.lock().unwrap().push(EventQueueDiagnostic {
        schema: "pay".into(),
        queue: "outbox",
        available: true,
        pending: 3,
        retries: 1,
        dead_letters: 0,
        oldest_at: Some("2026-09-02T10:00:00Z".into()),
    });
    let manager = InfrastructureManager::new(Box::new(host), || 1_000);
    let rows = manager.event_diagnostics().unwrap();
    assert_eq!(rows[0].pending, 3);
    let json = serde_json::to_string(&rows).unwrap();
    assert!(!json.contains("payload"));
    assert!(!json.contains("DATABASE_URL"));
}

#[test]
fn migration_files_are_read_only_from_the_eight_canonical_schema_directories() {
    let workspace = tempfile::tempdir().unwrap();
    let migration = workspace
        .path()
        .join("prisma/core/migrations/202609020001_base");
    std::fs::create_dir_all(&migration).unwrap();
    std::fs::write(
        migration.join("migration.sql"),
        "CREATE TABLE core.example(id int);\n",
    )
    .unwrap();
    let legacy = workspace
        .path()
        .join("prisma/migrations/core/202609020002_legacy");
    std::fs::create_dir_all(&legacy).unwrap();
    std::fs::write(legacy.join("migration.sql"), "SELECT 'legacy';\n").unwrap();
    let files = read_migration_files(workspace.path()).expect("read migration files");
    assert_eq!(files.get("core").unwrap().len(), 1);
    assert_eq!(files.get("core").unwrap()[0].name, "202609020001_base");
    assert_eq!(files.get("core").unwrap()[0].checksum.len(), 64);
    assert!(files.contains_key("pay"));
}

#[test]
fn backup_catalog_revalidates_size_and_sha_without_exposing_paths() {
    let root = tempfile::tempdir().unwrap();
    let backups = root.path().join("backups");
    std::fs::create_dir_all(&backups).unwrap();
    std::fs::write(backups.join("backup-a.dump"), b"verified dump").unwrap();
    let checksum = format!("{:x}", sha2::Sha256::digest(b"verified dump"));
    std::fs::write(
        backups.join("backup-a.json"),
        format!(r#"{{"version":1,"id":"backup-a","fileName":"backup-a.dump","createdAt":42,"bytes":13,"sha256":"{checksum}"}}"#),
    ).unwrap();

    let catalog = read_backup_catalog(root.path()).expect("read backups");
    assert_eq!(catalog[0].id, "backup-a");
    assert_eq!(catalog[0].integrity, "verified");
    assert!(!serde_json::to_string(&catalog[0]).unwrap().contains("dump"));

    std::fs::write(backups.join("backup-a.dump"), b"tampered").unwrap();
    let catalog = read_backup_catalog(root.path()).expect("read tampered backup");
    assert_eq!(catalog[0].integrity, "invalid");
}

#[test]
fn restore_resolves_only_a_verified_opaque_backup_id() {
    let root = tempfile::tempdir().unwrap();
    let backups = root.path().join("backups");
    std::fs::create_dir_all(&backups).unwrap();
    std::fs::write(backups.join("backup-a.dump"), b"verified dump").unwrap();
    let checksum = format!("{:x}", sha2::Sha256::digest(b"verified dump"));
    std::fs::write(backups.join("backup-a.json"), format!(r#"{{"version":1,"id":"backup-a","fileName":"backup-a.dump","createdAt":42,"bytes":13,"sha256":"{checksum}"}}"#)).unwrap();
    assert_eq!(
        resolve_verified_backup(root.path(), "backup-a").unwrap(),
        backups.join("backup-a.dump").canonicalize().unwrap()
    );
    assert!(resolve_verified_backup(root.path(), "../backup-a")
        .unwrap_err()
        .contains("ID"));
    std::fs::write(backups.join("backup-a.dump"), b"tampered").unwrap();
    assert!(resolve_verified_backup(root.path(), "backup-a")
        .unwrap_err()
        .contains("integridade"));
}

#[test]
fn logs_are_bounded_and_secrets_are_redacted() {
    let manager = InfrastructureManager::new(Box::new(FakeHost::default()), || 1_000);
    let logs = manager.logs(InfrastructureServiceId::Postgres).unwrap();
    assert_eq!(logs, ["postgresql://[REDACTED]@127.0.0.1:55432/matriz"]);
}

#[test]
#[ignore = "downloads and executes the pinned official NATS artifact"]
fn portable_nats_artifact_installs_starts_and_stops_under_a_temporary_root() {
    use std::{
        net::{IpAddr, Ipv4Addr, SocketAddr, TcpStream},
        thread,
        time::Duration,
    };

    for port in [54222, 58222] {
        let address = SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), port);
        assert!(
            TcpStream::connect_timeout(&address, Duration::from_millis(200)).is_err(),
            "NATS acceptance port {port} is already occupied"
        );
    }
    let root = tempfile::tempdir().expect("temporary infrastructure root");
    let host = PortableInfrastructureHost::new(root.path().to_path_buf());
    host.execute(InfrastructureTargetId::Nats, InfrastructureAction::Install)
        .expect("install pinned NATS");
    assert!(root.path().join("nats/2.14.5/nats-server.exe").is_file());
    host.execute(InfrastructureTargetId::Nats, InfrastructureAction::Start)
        .expect("start authenticated NATS");
    for _ in 0..40 {
        if host
            .inspect(InfrastructureServiceId::Nats)
            .is_ok_and(|state| state.healthy && state.owned)
        {
            break;
        }
        thread::sleep(Duration::from_millis(250));
    }
    let running = host.inspect(InfrastructureServiceId::Nats);
    // Stop the owned process before asserting health, including failed health checks.
    let stopped = host.execute(InfrastructureTargetId::Nats, InfrastructureAction::Stop);
    let running = running.expect("inspect NATS");
    assert!(running.healthy && running.owned);
    stopped.expect("stop owned NATS");
}
