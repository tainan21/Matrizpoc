# Matriz Control

Local operational cockpit for known Matriz projects and processes.

## Ownership

- **Responsibility:** start declared project actions and expose bounded local terminal sessions.
- **Exposes:** `public-contract.ts` with its manifest only.
- **Does not expose:** shell primitives, arbitrary filesystem access, or another app's internals.
- **May import:** stable `@matriz/*` infrastructure contracts.
- **Must not import:** another app's `src/**` or `app/**`.

## Run

```powershell
$env:MATRIZ_CONTROL_LOCAL_TOKEN = "choose-a-long-local-secret"
corepack pnpm --filter @matriz/app-matriz-control dev
```

Open `http://localhost:3009/apps`. The terminal process supervisor is memory-only and intended for loopback development.
