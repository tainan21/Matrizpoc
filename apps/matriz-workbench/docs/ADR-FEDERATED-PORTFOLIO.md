# ADR — Federated portfolio

## Decision

The Infra Hub contains strongly related apps. Independent repositories remain
independent and are registered in the Workbench through portable metadata plus
a machine-local, Git-ignored binding.

## Why

Moving every repository into one monorepo would couple release cadence,
permissions and migrations before the boundaries are understood. Integrating
only through GitHub would make local knowledge and offline coworking dependent
on a remote service. The federated model preserves ownership while giving the
Workbench a safe read-only projection.

## Consequences

- no computer-wide filesystem discovery;
- no source editing through the Workbench browser or MCP;
- absolute paths never enter versioned files;
- source documents remain canonical and are not copied;
- a repository can be disconnected without breaking a clean clone;
- migration into the Hub is a later, explicit decision per project.

## Reversal criteria

Move a project into the Hub only when shared tooling produces measurable value,
release ownership is aligned, boundaries are stable and the move can preserve
history without importing product domain into shared packages.

