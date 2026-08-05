# Federated portfolio

The Workbench is a control plane for a portfolio, not a container for all code.
Closely related apps can live in this monorepo. Independent products and
libraries remain in their own repositories.

## Two-part registration

The portable file `.matriz/repositories.json` contains:

- stable ID and display name;
- project kind and Git remote;
- document include rules;
- read-only policy.

The ignored file `.matriz/local/repository-bindings.json` maps those IDs to
checkouts on one machine. A missing binding means “known but unavailable”; it
does not break a clean clone.

## Safety

- no automatic computer-wide discovery;
- all local paths pass realpath and symlink checks;
- only registered sources can be opened;
- `.git`, dependencies, builds, caches, logs and env files are excluded;
- catalogs return metadata before content;
- a full document requires an explicit path already accepted by the catalog;
- package inspection returns bounded manifest keys, never source or commands;
- external sources are read-only in this phase.

## Current project-school sources

- Matriz Lib UI: package and documentation reference;
- Seumei: functional and knowledge reference;
- New Seumei: historical record without a local binding;
- Laudate: read-only site reference.

The four Seumei synthesis documents live in the Infra Hub Workbench workspace.
They point to source paths and classifications; they do not duplicate the
original documents.

The Matriz Lib UI adoption boundary and evidence are recorded in
`ADR-MATRIZ-LIB-UI-BOUNDARY.md` and
`MATRIZ-LIB-UI-ADOPTION-AUDIT-2026-07-30.md`.
