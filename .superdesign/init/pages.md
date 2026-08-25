# Matriz Control page dependency trees

## `/apps` — primary visual anchor

Entry: `apps/matriz-control/app/apps/page.tsx`

- `apps/matriz-control/src/ui/apps-console.tsx`
  - `apps/matriz-control/src/domain/terminal.ts`
  - `apps/matriz-control/src/ui/terminal/terminal-context.tsx`
    - `apps/matriz-control/src/ui/terminal/terminal-preferences.ts`
- `apps/matriz-control/app/layout.tsx`
  - `apps/matriz-control/src/ui/control-shell.tsx`
    - `apps/matriz-control/src/ui/terminal/terminal-dock.tsx`
    - `apps/matriz-control/src/ui/terminal/terminal-context.tsx`
  - `apps/matriz-control/app/globals.css`

## `/terminal`

Entry: `apps/matriz-control/app/terminal/page.tsx`

- `apps/matriz-control/src/ui/terminal/terminal-page.tsx`
  - `apps/matriz-control/src/domain/terminal.ts`
  - `apps/matriz-control/src/ui/terminal/terminal-context.tsx`
- shared layout dependency tree from `/apps`

## `/workspace`, `/actions`, `/store`, `/doctor`, `/settings`

Each entry imports:

- `apps/matriz-control/src/ui/placeholder-page.tsx`
- shared layout dependency tree from `/apps`

## `/unlock`

Entry: `apps/matriz-control/app/unlock/page.tsx`

- `apps/matriz-control/app/actions.ts`
- `apps/matriz-control/src/auth/local-access.ts`
- `apps/matriz-control/app/globals.css`

## `/browser` — new target

No source exists yet. Reuse the shared layout dependency tree and `/apps` as the visual/structural anchor.
