# Control integration

Matriz Workbench can run in three local modes without changing its domain
ownership:

- **Web + Hub:** uses the existing Hub session when it is reachable and valid.
- **Standalone:** provisions a deterministic internal Demo identity when Hub
  is unavailable and no local token was configured.
- **Control desktop:** Matriz Control starts the packaged standalone server,
  injects separate session and capability secrets, validates authenticated
  health and installs HTTP-only cookies before showing the window.

Control owns process lifecycle and may invoke only actions declared in its
catalog. Workbench owns diagnostics, repair state and `.matriz/**` records.
Neither app imports the other's internals; communication uses the versioned
`workbench-control-v1` loopback contract.

## Automatic repair

1. Control maps a failed managed action to a bounded, sanitized diagnostic.
2. Workbench deduplicates and persists it under `.matriz/diagnostics`.
3. A repair creates an operational backlog item and a scoped Codex request.
4. Codex starts read-only, network-disabled and without automatic approvals.
5. Success issues exactly one lease to rerun the original catalog action.
6. Failure enters cooldown; the third unsuccessful attempt becomes blocked.

Browser input cannot choose executable paths, URLs, commands or arbitrary
rerun actions. Tokens, cookies, environment values and raw terminal output are
not persisted in diagnostics.

## Packaging

The Control desktop build first creates the Workbench standalone build and
copies the complete runtime dependency layout. Installer filters explicitly
exclude `.matriz`, `.env*`, logs, source code and development documentation.
Static assets are placed beside the packaged Workbench server at the path
expected by Next.js.
