use std::{fs, path::Path, process::Command};

use matriz_desktop_native::git::{
    GitBranchAction, GitBranchRequest, GitRemoteAction, GitSelectionRequest, GitService,
};

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
    assert!(
        snapshot
            .branches
            .iter()
            .any(|branch| branch.name == "main" && branch.current),
        "branches: {:?}",
        snapshot.branches
    );
    assert!(snapshot
        .reflog
        .iter()
        .any(|entry| entry.subject.contains("initial")));
    assert!(snapshot
        .recent
        .iter()
        .any(|entry| entry.subject == "initial"));
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

#[test]
fn remote_flow_is_fixed_to_fetch_ff_only_pull_and_push() {
    let remote = tempfile::tempdir().expect("bare remote fixture");
    git(remote.path(), &["init", "--bare"]);

    let repository = repository();
    git(
        repository.path(),
        &[
            "remote",
            "add",
            "origin",
            &remote.path().display().to_string(),
        ],
    );
    git(repository.path(), &["push", "-u", "origin", "main"]);

    let service = GitService::default();
    let snapshot = service.snapshot(repository.path()).expect("snapshot");
    let fetched = service
        .remote(
            repository.path(),
            &snapshot.revision,
            GitRemoteAction::Fetch,
        )
        .expect("fixed fetch");
    assert_eq!(fetched.upstream.as_deref(), Some("origin/main"));

    fs::write(repository.path().join("tracked.txt"), "dirty\n").expect("dirty fixture");
    let dirty = service.snapshot(repository.path()).expect("dirty snapshot");
    assert!(service
        .remote(repository.path(), &dirty.revision, GitRemoteAction::Pull)
        .expect_err("pull must reject dirty trees")
        .contains("clean"));

    fs::write(repository.path().join("tracked.txt"), "base\n").expect("restore fixture");
    fs::write(repository.path().join("local.txt"), "local\n").expect("local fixture");
    git(repository.path(), &["add", "local.txt"]);
    git(repository.path(), &["commit", "-m", "local"]);
    let ahead = service.snapshot(repository.path()).expect("ahead snapshot");
    let pushed = service
        .remote(repository.path(), &ahead.revision, GitRemoteAction::Push)
        .expect("fixed push");
    assert_eq!(pushed.ahead, 0);
}

#[test]
fn local_branch_and_merge_require_observed_revisions_and_one_time_confirmation() {
    let repository = repository();
    let service = GitService::default();
    let main = service.snapshot(repository.path()).expect("main snapshot");
    service
        .branch(
            repository.path(),
            &GitBranchRequest {
                revision: main.revision,
                action: GitBranchAction::Create,
                name: "feature/safe".into(),
            },
        )
        .expect("create branch");
    fs::write(repository.path().join("feature.txt"), "feature\n").expect("feature fixture");
    git(repository.path(), &["add", "feature.txt"]);
    git(repository.path(), &["commit", "-m", "feature"]);
    let feature = service
        .snapshot(repository.path())
        .expect("feature snapshot");
    let main = service
        .branch(
            repository.path(),
            &GitBranchRequest {
                revision: feature.revision,
                action: GitBranchAction::Switch,
                name: "main".into(),
            },
        )
        .expect("switch main");
    let preview = service
        .preview_merge(repository.path(), &main.revision, "feature/safe")
        .expect("merge preview");
    assert_eq!(preview.commits, 1);
    assert_eq!(preview.changed_files, 1);
    let merged = service
        .confirm_merge(repository.path(), &preview.confirmation_token)
        .expect("merge");
    assert_eq!(merged.branch, "main");
    assert!(service
        .confirm_merge(repository.path(), &preview.confirmation_token)
        .is_err());
    assert!(repository.path().join("feature.txt").is_file());
}
