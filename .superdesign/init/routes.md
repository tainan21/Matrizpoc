# Matriz Control routes

All routes use `apps/matriz-control/app/layout.tsx` and therefore the persistent `ControlShell` and `TerminalDock`.

| URL | File | Purpose |
| --- | --- | --- |
| `/` | `apps/matriz-control/app/page.tsx` | Redirects to `/apps`. |
| `/apps` | `apps/matriz-control/app/apps/page.tsx` | Project/process cockpit and primary visual anchor. |
| `/workspace` | `apps/matriz-control/app/workspace/page.tsx` | Placeholder for validated local projects. |
| `/terminal` | `apps/matriz-control/app/terminal/page.tsx` | Full terminal session management. |
| `/actions` | `apps/matriz-control/app/actions/page.tsx` | Placeholder for bounded operational actions. |
| `/store` | `apps/matriz-control/app/store/page.tsx` | Placeholder for approved operational utilities. |
| `/doctor` | `apps/matriz-control/app/doctor/page.tsx` | Placeholder for local diagnostics. |
| `/settings` | `apps/matriz-control/app/settings/page.tsx` | Placeholder for device preferences. |
| `/unlock` | `apps/matriz-control/app/unlock/page.tsx` | Loopback token unlock form outside the authenticated experience. |
| `/browser` | new target | Intelligent local browser cockpit designed by this project. |
