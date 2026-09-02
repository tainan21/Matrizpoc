use std::{fs, path::Path, process::Command};

use matriz_desktop_native::git::{GitSelectionRequest, GitService};

fn git(root: &Path, args: &[&str]) {
    let status = Command::new("git.exe")
        .current_dir(root)
        .args(args)
        .status()
        .expect("git fixture command");
    assert!(status.success(), "git {:?} failed", args);
}

fn repository() -> tempfile::TempDir {
    let directory = tempfile::tempdir().expect("git fixture");
    git(directory.path(), &["init", "-b", "main"]);
    git(directory.path(), &["config", "user.name", "Matriz Test"]);
    git(
        directory.path(),
        &["config", "user.email", "matriz@example.test"],
    );
    fs::write(directory.path().join("tracked.txt"), "base\n").expect("tracked fixture");
    git(directory.path(), &["add", "tracked.txt"]);
    git(directory.path(), &["commit", "-m", "initial"]);
    directory
}

#[test]
fn opaque_change_ids_drive_diff_and_exact_staging() {
    let repository = repository();
    let service = GitService::default();
    fs::write(repository.path().join("tracked.txt"), "base\nchanged\n").expect("change fixture");

    let snapshot = service.snapshot(repository.path()).expect("snapshot");
    let change = snapshot.changes.first().expect("observed change");
    assert_ne!(change.id, change.path);
    assert!(service
        .diff(repository.path(), &snapshot.revision, &change.id)
        .expect("bounded diff")
        .lines
        .iter()
        .any(|line| line.contains("changed")));

    let next = service
        .stage(
            repository.path(),
            &GitSelectionRequest {
                revision: snapshot.revision,
                change_ids: vec![change.id.clone()],
            },
        )
        .expect("exact stage");
    assert!(next.changes.iter().any(|change| change.staged));
}

#[test]
fn stale_revisions_and_unsafe_commit_messages_are_rejected() {
    let repository = repository();
    let service = GitService::default();
    fs::write(repository.path().join("tracked.txt"), "changed\n").expect("change fixture");
    let snapshot = service.snapshot(repository.path()).expect("snapshot");
    fs::write(repository.path().join("second.txt"), "new\n").expect("stale fixture");

    let error = service
        .stage(
            repository.path(),
            &GitSelectionRequest {
                revision: snapshot.revision.clone(),
                change_ids: vec![snapshot.changes[0].id.clone()],
            },
        )
        .expect_err("stale revision must fail");
    assert!(error.contains("stale"));
    assert!(service
        .commit(repository.path(), &snapshot.revision, "bad\nmessage")
        .expect_err("multiline commit must fail")
        .contains("message"));
}
