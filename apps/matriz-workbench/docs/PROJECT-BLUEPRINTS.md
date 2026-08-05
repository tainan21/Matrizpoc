# Project blueprints

A blueprint is a contract-first proposal for creating or adopting a project.
It is not a browser-based code generator.

## Flow

1. The human provides name, kind, target, platforms, domains, capabilities,
   candidate shared concerns, template and validation commands.
2. The Workbench validates and stores a deterministic preview in
   `.matriz/blueprints`.
3. It creates a backlog item and a queued Codex request.
4. Codex reads the preview, checks boundaries and asks for approval.
5. Codex applies only the approved scaffold and records changed files/checks.

The browser never receives a generic filesystem or shell primitive.

## Templates

- `application-next`: minimal app contract, manifest and bootstrap;
- `library-typescript`: minimal library with one public entry point;
- `site-collection-next`: minimal Sites contract plus preset directory;
- `adopt-existing`: initializes `.matriz` only.

Domain layers are created by the first real use case, not as empty ceremony.
Shared packages still require two consumers, a stable surface and no strong
product semantics.

