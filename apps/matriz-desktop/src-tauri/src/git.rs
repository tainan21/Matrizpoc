use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    process::{Command, Output, Stdio},
    sync::{Arc, Mutex},
};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x0800_0000;
const MAX_GIT_OUTPUT: usize = 4 * 1024 * 1024;
const MAX_DIFF_LINES: usize = 400;
const MAX_DIFF_BYTES: usize = 64 * 1024;

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitChange {
    pub id: String,
    pub path: String,
    pub index_status: String,
    pub worktree_status: String,
    pub staged: bool,
    pub has_worktree_changes: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitCommitSummary {
    pub id: String,
    pub short_id: String,
    pub subject: String,
    pub author: String,
    pub occurred_at: i64,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitBranchSummary {
    pub name: String,
    pub current: bool,
    pub upstream: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitReflogEntry {
    pub short_id: String,
    pub subject: String,
    pub occurred_at: i64,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitSnapshot {
    pub revision: String,
    pub branch: String,
    pub upstream: Option<String>,
    pub ahead: usize,
    pub behind: usize,
    pub changes: Vec<GitChange>,
    pub recent: Vec<GitCommitSummary>,
    pub branches: Vec<GitBranchSummary>,
    pub reflog: Vec<GitReflogEntry>,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum GitRemoteAction {
    Fetch,
    Pull,
    Push,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitSelectionRequest {
    pub revision: String,
    pub change_ids: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitDiffRequest {
    pub revision: String,
    pub change_id: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitCommitRequest {
    pub revision: String,
    pub message: String,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum GitBranchAction {
    Create,
    Switch,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitBranchRequest {
    pub revision: String,
    pub action: GitBranchAction,
    pub name: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitDiff {
    pub change_id: String,
    pub staged: bool,
    pub lines: Vec<String>,
    pub truncated: bool,
}

struct ObservedGit {
    root: PathBuf,
    snapshot: GitSnapshot,
    paths: HashMap<String, String>,
}

#[derive(Clone, Default)]
pub struct GitService {
    observed: Arc<Mutex<Option<ObservedGit>>>,
}

impl GitService {
    pub fn snapshot(&self, root: &Path) -> Result<GitSnapshot, String> {
        let observed = observe(root)?;
        let snapshot = observed.snapshot.clone();
        *self.observed.lock().map_err(|_| "Git lock poisoned")? = Some(observed);
        Ok(snapshot)
    }

    pub fn diff(&self, root: &Path, revision: &str, change_id: &str) -> Result<GitDiff, String> {
        let (path, staged) = self.verify_change(root, revision, change_id)?;
        let mut args = vec![
            "diff".to_owned(),
            "--no-ext-diff".to_owned(),
            "--unified=3".to_owned(),
        ];
        if staged {
            args.push("--cached".to_owned());
        }
        args.extend(["--".to_owned(), path]);
        let output = git_output(root, &args)?;
        let mut bytes = 0usize;
        let mut truncated = false;
        let mut lines = Vec::new();
        for line in output.lines() {
            bytes += line.len();
            if lines.len() >= MAX_DIFF_LINES || bytes > MAX_DIFF_BYTES {
                truncated = true;
                break;
            }
            lines.push(line.to_owned());
        }
        if lines.is_empty() {
            lines.push("Arquivo novo ou sem diff textual disponível antes do stage.".into());
        }
        Ok(GitDiff {
            change_id: change_id.to_owned(),
            staged,
            lines,
            truncated,
        })
    }

    pub fn stage(&self, root: &Path, request: &GitSelectionRequest) -> Result<GitSnapshot, String> {
        let paths = self.verify_selection(root, request)?;
        let mut args = vec!["add".to_owned(), "--".to_owned()];
        args.extend(paths);
        git_output(root, &args)?;
        self.snapshot(root)
    }

    pub fn unstage(
        &self,
        root: &Path,
        request: &GitSelectionRequest,
    ) -> Result<GitSnapshot, String> {
        let paths = self.verify_selection(root, request)?;
        let mut args = vec!["restore".to_owned(), "--staged".to_owned(), "--".to_owned()];
        args.extend(paths);
        git_output(root, &args)?;
        self.snapshot(root)
    }

    pub fn commit(
        &self,
        root: &Path,
        revision: &str,
        message: &str,
    ) -> Result<GitSnapshot, String> {
        let message = message.trim();
        if message.is_empty() || message.len() > 200 || message.contains(['\r', '\n']) {
            return Err("Commit message must contain one line with 1 to 200 characters".into());
        }
        self.verify_revision(root, revision)?;
        git_output(root, &["commit".into(), "-m".into(), message.to_owned()])?;
        self.snapshot(root)
    }

    pub fn remote(
        &self,
        root: &Path,
        revision: &str,
        action: GitRemoteAction,
    ) -> Result<GitSnapshot, String> {
        self.verify_revision(root, revision)?;
        let observed = observe(root)?;
        if observed.snapshot.upstream.is_none() {
            return Err("Current branch has no configured upstream".into());
        }
        if action == GitRemoteAction::Pull && !observed.snapshot.changes.is_empty() {
            return Err("Pull requires a clean worktree".into());
        }
        let args = match action {
            GitRemoteAction::Fetch => vec!["fetch".into(), "--prune".into()],
            GitRemoteAction::Pull => vec!["pull".into(), "--ff-only".into()],
            GitRemoteAction::Push => vec!["push".into()],
        };
        git_output(root, &args)?;
        self.snapshot(root)
    }

    pub fn branch(&self, root: &Path, request: &GitBranchRequest) -> Result<GitSnapshot, String> {
        self.verify_revision(root, &request.revision)?;
        if !observe(root)?.snapshot.changes.is_empty() {
            return Err("Branch changes require a clean worktree".into());
        }
        validate_branch_name(root, &request.name)?;
        let args = match request.action {
            GitBranchAction::Create => vec!["switch".into(), "-c".into(), request.name.clone()],
            GitBranchAction::Switch => vec!["switch".into(), "--".into(), request.name.clone()],
        };
        git_output(root, &args)?;
        self.snapshot(root)
    }

    fn verify_revision(&self, root: &Path, revision: &str) -> Result<(), String> {
        let root = canonical_repository(root)?;
        let current = observe(&root)?;
        let guard = self.observed.lock().map_err(|_| "Git lock poisoned")?;
        let observed = guard
            .as_ref()
            .ok_or("Git snapshot is missing; refresh first")?;
        if observed.root != root
            || observed.snapshot.revision != revision
            || current.snapshot.revision != revision
        {
            return Err("Git snapshot is stale; refresh before changing the index".into());
        }
        Ok(())
    }

    fn verify_selection(
        &self,
        root: &Path,
        request: &GitSelectionRequest,
    ) -> Result<Vec<String>, String> {
        if request.change_ids.is_empty() || request.change_ids.len() > 200 {
            return Err("Select between 1 and 200 observed changes".into());
        }
        self.verify_revision(root, &request.revision)?;
        let guard = self.observed.lock().map_err(|_| "Git lock poisoned")?;
        let observed = guard
            .as_ref()
            .ok_or("Git snapshot is missing; refresh first")?;
        let mut paths = Vec::with_capacity(request.change_ids.len());
        for id in &request.change_ids {
            let path = observed
                .paths
                .get(id)
                .ok_or_else(|| format!("Unknown Git change id: {id}"))?;
            if !paths.contains(path) {
                paths.push(path.clone());
            }
        }
        Ok(paths)
    }

    fn verify_change(
        &self,
        root: &Path,
        revision: &str,
        change_id: &str,
    ) -> Result<(String, bool), String> {
        self.verify_revision(root, revision)?;
        let guard = self.observed.lock().map_err(|_| "Git lock poisoned")?;
        let observed = guard
            .as_ref()
            .ok_or("Git snapshot is missing; refresh first")?;
        let path = observed
            .paths
            .get(change_id)
            .ok_or_else(|| format!("Unknown Git change id: {change_id}"))?
            .clone();
        let staged = observed
            .snapshot
            .changes
            .iter()
            .find(|change| change.id == change_id)
            .is_some_and(|change| change.staged);
        Ok((path, staged))
    }
}

fn observe(root: &Path) -> Result<ObservedGit, String> {
    let root = canonical_repository(root)?;
    let branch = git_output(&root, &["branch".into(), "--show-current".into()])?;
    let head = git_output(&root, &["rev-parse".into(), "HEAD".into()]).unwrap_or_default();
    let upstream = git_output(
        &root,
        &[
            "rev-parse".into(),
            "--abbrev-ref".into(),
            "--symbolic-full-name".into(),
            "@{upstream}".into(),
        ],
    )
    .ok()
    .filter(|value| !value.is_empty());
    let (ahead, behind) = upstream
        .as_ref()
        .and_then(|_| {
            git_output(
                &root,
                &[
                    "rev-list".into(),
                    "--left-right".into(),
                    "--count".into(),
                    "HEAD...@{upstream}".into(),
                ],
            )
            .ok()
        })
        .and_then(|value| {
            let mut counts = value
                .split_whitespace()
                .filter_map(|item| item.parse().ok());
            Some((counts.next()?, counts.next()?))
        })
        .unwrap_or((0, 0));
    let status = git_output_bytes(
        &root,
        &["status".into(), "--porcelain=v1".into(), "-z".into()],
    )?;
    let revision = digest_revision(&branch, &head, &status);
    let mut changes = Vec::new();
    let mut paths = HashMap::new();
    let mut tokens = status
        .split(|byte| *byte == 0)
        .filter(|token| !token.is_empty());
    let mut index = 0usize;
    while let Some(record) = tokens.next() {
        if record.len() < 4 {
            continue;
        }
        let index_status = record[0] as char;
        let worktree_status = record[1] as char;
        let path = String::from_utf8_lossy(&record[3..]).to_string();
        if matches!(index_status, 'R' | 'C') || matches!(worktree_status, 'R' | 'C') {
            let _ = tokens.next();
        }
        let id = change_id(&revision, index, &path);
        paths.insert(id.clone(), path.clone());
        changes.push(GitChange {
            id,
            path,
            index_status: index_status.to_string(),
            worktree_status: worktree_status.to_string(),
            staged: !matches!(index_status, ' ' | '?'),
            has_worktree_changes: !matches!(worktree_status, ' '),
        });
        index += 1;
    }
    let recent = recent_commits(&root)?;
    let branches = branch_summaries(&root, &branch, upstream.as_deref());
    let reflog = reflog_entries(&root);
    Ok(ObservedGit {
        root,
        snapshot: GitSnapshot {
            revision,
            branch: if branch.is_empty() {
                "HEAD".into()
            } else {
                branch
            },
            upstream,
            ahead,
            behind,
            changes,
            recent,
            branches,
            reflog,
        },
        paths,
    })
}

fn branch_summaries(
    root: &Path,
    current_branch: &str,
    current_upstream: Option<&str>,
) -> Vec<GitBranchSummary> {
    git_output(
        root,
        &[
            "for-each-ref".into(),
            "--sort=-committerdate".into(),
            "--format=%(refname:short)".into(),
            "refs/heads".into(),
        ],
    )
    .unwrap_or_default()
    .lines()
    .map(str::trim)
    .filter(|name| !name.is_empty())
    .map(|name| GitBranchSummary {
        name: name.to_owned(),
        current: name == current_branch,
        upstream: if name == current_branch {
            current_upstream.map(str::to_owned)
        } else {
            None
        },
    })
    .collect()
}

fn reflog_entries(root: &Path) -> Vec<GitReflogEntry> {
    git_output(
        root,
        &[
            "reflog".into(),
            "-10".into(),
            "--pretty=format:%h%x1f%gs%x1f%ct".into(),
        ],
    )
    .unwrap_or_default()
    .lines()
    .filter_map(|line| {
        let mut fields = line.split('\u{1f}');
        Some(GitReflogEntry {
            short_id: fields.next()?.to_owned(),
            subject: fields.next()?.to_owned(),
            occurred_at: fields.next()?.parse().ok()?,
        })
    })
    .collect()
}

fn recent_commits(root: &Path) -> Result<Vec<GitCommitSummary>, String> {
    let output = git_output(
        root,
        &[
            "log".into(),
            "-10".into(),
            "--pretty=format:%H%x1f%h%x1f%s%x1f%an%x1f%ct".into(),
        ],
    )
    .unwrap_or_default();
    Ok(output
        .lines()
        .filter_map(|line| {
            let mut fields = line.split('\u{1f}');
            Some(GitCommitSummary {
                id: fields.next()?.to_owned(),
                short_id: fields.next()?.to_owned(),
                subject: fields.next()?.to_owned(),
                author: fields.next()?.to_owned(),
                occurred_at: fields.next()?.parse().ok()?,
            })
        })
        .collect())
}

fn canonical_repository(root: &Path) -> Result<PathBuf, String> {
    let root = root.canonicalize().map_err(|error| error.to_string())?;
    let observed = git_output(&root, &["rev-parse".into(), "--show-toplevel".into()])?;
    let repository = PathBuf::from(observed)
        .canonicalize()
        .map_err(|error| error.to_string())?;
    if repository != root {
        return Err("Git root does not match the validated Matriz workspace".into());
    }
    Ok(root)
}

fn validate_branch_name(root: &Path, name: &str) -> Result<(), String> {
    if name.is_empty() || name.len() > 120 || name.starts_with('-') || !name.is_ascii() {
        return Err("Branch name is invalid".into());
    }
    git_output(
        root,
        &[
            "check-ref-format".into(),
            "--branch".into(),
            name.to_owned(),
        ],
    )
    .map(|_| ())
    .map_err(|_| "Branch name is invalid".into())
}

fn git_output(root: &Path, args: &[String]) -> Result<String, String> {
    let output = git_command(root, args)?;
    let value = if output.stdout.is_empty() {
        &output.stderr
    } else {
        &output.stdout
    };
    Ok(String::from_utf8_lossy(value).trim().to_owned())
}

fn git_output_bytes(root: &Path, args: &[String]) -> Result<Vec<u8>, String> {
    Ok(git_command(root, args)?.stdout)
}

fn git_command(root: &Path, args: &[String]) -> Result<Output, String> {
    let mut command = Command::new("git.exe");
    command
        .current_dir(root)
        .args(args)
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GCM_INTERACTIVE", "Never")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);
    let output = command.output().map_err(|error| error.to_string())?;
    if output.stdout.len() + output.stderr.len() > MAX_GIT_OUTPUT {
        return Err("Git output exceeded the safe limit".into());
    }
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        return Err(if error.is_empty() {
            "Git command failed".into()
        } else {
            error
        });
    }
    Ok(output)
}

fn digest_revision(branch: &str, head: &str, status: &[u8]) -> String {
    let mut digest = Sha256::new();
    digest.update(branch.as_bytes());
    digest.update([0]);
    digest.update(head.as_bytes());
    digest.update([0]);
    digest.update(status);
    format!("{:x}", digest.finalize())
}

fn change_id(revision: &str, index: usize, path: &str) -> String {
    let mut digest = Sha256::new();
    digest.update(revision.as_bytes());
    digest.update(index.to_le_bytes());
    digest.update(path.as_bytes());
    format!("change-{:x}", digest.finalize())
}
