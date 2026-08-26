# Health

Lightweight, local Windows resource and process observability.

## Ownership

- **Responsibility:** Read-only local system observation.
- **Exposes:** `public-contract.ts` with the app manifest only.
- **Does not expose:** `src/**` and `app/**` internals.
- **May import:** Matriz packages and other apps' `public-contract.ts` manifest surfaces.
- **Must not import:** Another app's `src/**` or `app/**`; Health also must not control processes or own product data.

The local development server runs on `http://127.0.0.1:3010` and exposes `/api/health`.

## Operating scope and usage

Health is a read-only Windows-local view. It samples this computer's CPU,
memory, uptime, processes, and (when Windows exposes it) thermal sensors. It
does not start, stop, restart, or otherwise control processes, and it does not
own product data. Control owns installation, lifecycle, and the optional
desktop host-tab bridge; Health owns the observation adapters, presenters, and
dashboard. The only cross-app surface is the manifest-only
`public-contract.ts`.

The dashboard polls lightweight system metrics once per second while visible.
Process rows are refreshed at a slower five-second cadence, and the thermal
sensor is cached for 30 seconds. A missing or unsupported thermal sensor is
shown explicitly as **Não disponível neste hardware**; it is never represented
as zero. PowerShell and sensor failures degrade to an empty process list or an
unavailable temperature rather than becoming a fabricated reading.

When opened inside the Matriz Control Desktop, Health can receive validated
Control tab counts over the local bridge. In ordinary web mode that metric is
marked unavailable with instructions to open Health in Control Desktop. The
Health runtime starts only when Control opens the installed app and is removed
from the page when the user switches back to Control.
