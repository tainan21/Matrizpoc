use std::{collections::HashMap, sync::Mutex};

use matriz_desktop_native::infrastructure::{
    compare_migration_ledger, read_backup_catalog, read_migration_files, AppliedMigration,
    InfrastructureAction, InfrastructureHost, InfrastructureInspection, InfrastructureManager,
    InfrastructurePreviewRequest, InfrastructureServiceId, InfrastructureTargetId,
    MigrationFileDigest, PortableInfrastructureHost,
};
use sha2::Digest;

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
fn database_provisioning_requires_the_healthy_postgres_catalog_target() {
    let manager = InfrastructureManager::new(Box::new(FakeHost::default()), || 1_000);
    let snapshot = manager.snapshot().unwrap();
    let error = manager
        .preview(InfrastructurePreviewRequest {
            target_id: InfrastructureTargetId::Nats,
            action_id: InfrastructureAction::Provision,
            revision: snapshot.revision,
        })
        .unwrap_err();
    assert!(error.contains("PostgreSQL saudável"));
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
fn migration_files_are_read_only_from_the_eight_canonical_schema_directories() {
    let workspace = tempfile::tempdir().unwrap();
    let migration = workspace.path().join("prisma/core/migrations/001_base");
    std::fs::create_dir_all(&migration).unwrap();
    std::fs::write(
        migration.join("migration.sql"),
        "CREATE TABLE core.example(id int);\n",
    )
    .unwrap();
    let files = read_migration_files(workspace.path()).expect("read migration files");
    assert_eq!(files.get("core").unwrap()[0].name, "001_base");
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

    let address = SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), 54222);
    assert!(
        TcpStream::connect_timeout(&address, Duration::from_millis(200)).is_err(),
        "NATS acceptance port is already occupied"
    );
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
    let running = host
        .inspect(InfrastructureServiceId::Nats)
        .expect("inspect NATS");
    assert!(running.healthy && running.owned);
    host.execute(InfrastructureTargetId::Nats, InfrastructureAction::Stop)
        .expect("stop owned NATS");
}
