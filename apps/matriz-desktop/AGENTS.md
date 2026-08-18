# AGENTS.md — Matriz Desktop

## Objective

Keep the Windows utility fast, local and incapable of arbitrary execution.

## Boundaries

- Privileged behavior belongs in `src-tauri`; UI calls a typed gateway.
- Never expose generic shell, filesystem, URL or process-name commands.
- Never import another app's `src/**` or `app/**`.
- Consume MatrizLib through public `@matriz/design-*` exports only.
- Keep Windows-specific behavior behind app-local adapters.

## Validation

- `pnpm --filter @matriz/app-matriz-desktop test`
- `pnpm --filter @matriz/app-matriz-desktop typecheck`
- `pnpm --filter @matriz/app-matriz-desktop lint`
- `cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml`
- `pnpm --filter @matriz/app-matriz-desktop package`
