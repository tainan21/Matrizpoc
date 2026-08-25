# Extractable Matriz Control components

## ControlShell
- Source: `apps/matriz-control/src/ui/control-shell.tsx`
- Category: layout
- Description: Persistent brand bar, module navigation, page viewport, and terminal host.
- Extractable props: active route, terminal placement, terminal open state
- Hardcoded: Matriz mark, navigation labels, global score, theme classes

## TerminalDock
- Source: `apps/matriz-control/src/ui/terminal/terminal-dock.tsx`
- Category: layout
- Description: Resizable bottom/right process console shared across all modules.
- Extractable props: placement, open state, active session, session count
- Hardcoded: terminal icons, controls, status classes

## PlaceholderPage
- Source: `apps/matriz-control/src/ui/placeholder-page.tsx`
- Category: basic
- Description: Reusable module-empty-state composition.
- Extractable props: eyebrow, title, copy
- Hardcoded: “Próximo módulo” status and prepared-area copy

## ProjectListRow
- Source: `apps/matriz-control/src/ui/apps-console.tsx`
- Category: basic
- Description: Compact operational row with status, name, port, process state, and disclosure affordance.
- Extractable props: selected, status, name, port
- Hardcoded: chevron and uppercase operational typography
