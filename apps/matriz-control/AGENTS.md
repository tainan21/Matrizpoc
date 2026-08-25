# AGENTS.md — Matriz Control

## Objective

Operate known local processes without exposing a generic remote shell.

## Boundaries

- Keep implementation inside `apps/matriz-control` unless a second consumer proves a shared extraction.
- Read projects through validated public metadata only.
- Never import another app's `src/**` or `app/**`.
- Browser requests contain project/action identifiers, never raw commands, env maps, or arbitrary paths.
- Do not persist terminal output or secrets.
- Render workspace terminal routes with the lowercase `mih` alias; never expose or rename the physical `matriz-infra-hub` directory in terminal screens.
- Resolve only the exact controlled `cd mih` route shortcut. Never generalize it into browser-supplied paths or arbitrary shell navigation.

## Validation

- `corepack pnpm --filter @matriz/app-matriz-control test`
- `corepack pnpm --filter @matriz/app-matriz-control lint`
- `corepack pnpm --filter @matriz/app-matriz-control typecheck`
- `corepack pnpm --filter @matriz/app-matriz-control build`
- `corepack pnpm test:smoke`
