# Installable Apps and Health — Design

**Status:** approved autonomously by the product owner  
**Date:** 2026-08-25  
**Owners:** `apps/matriz-control`, `apps/health`

## Decision

Matriz Control becomes the local host for small installable Matriz apps. An
installation does not copy source code or keep another runtime alive: it enables
an already-known app in a versioned local workspace and activates its declared
shell contribution. This visible change is called a **mutation**.

The first app is `health`. Installing it mutates Control by revealing a compact,
hover-expandable app rail. Opening it starts the app only when needed, mounts a
single app surface, changes the translucent background/accent, and keeps every
other external app unmounted. The target visual transition is one second; runtime
startup may take longer and remains explicit in the loading state.

## Why this shape

Three approaches were considered:

1. **Independent apps hosted by Control — chosen.** Each app owns its domain,
   manifest, bootstrap, API, presenter, and UI. Control owns installation and
   shell composition. Only the active external surface is mounted.
2. **Features compiled into Control.** This would use less runtime memory but
   would couple product domains to Control and prevent independent evolution.
3. **Several live app tabs hidden by Control.** Switching would be instant, but
   every app would keep a renderer/runtime alive and violate the low-memory goal.

The chosen approach respects L2/L3/L6, scales incrementally, and does not justify
a new shared package. A generic mutation package may be considered only after a
second host consumes the same stable behavior.

## Scope

### Included

- a Control-local installable-app catalog sourced from public manifests;
- versioned, local installation state with install/uninstall/open operations;
- a Store that installs `health` and reflects the mutation immediately;
- a smart left rail that expands on hover/focus and switches apps;
- one active external app surface at a time;
- lazy activation, readiness/error states, contextual accent/background, and
  reduced-motion support;
- a new standalone `apps/health` app for Windows-first system observation;
- CPU, memory, top processes, uptime, Control browser-tab counts, and temperature
  when Windows/hardware exposes a trustworthy sensor;
- scoped tests plus required global smoke/boundary validation.

### Deferred

- downloading arbitrary binaries or remote code;
- a remote app marketplace;
- executing untrusted plugins;
- GPU telemetry, fan control, process termination, or priority mutation;
- cross-device installation sync;
- macOS/Linux collectors;
- generic top-bar mutations such as a theme switcher. The first implementation
  leaves an app-local mutation model ready for the next real contribution.

## Boundaries and ownership

### Matriz Control

Control owns the host shell, catalog adapter, installation preference, runtime
activation, smart rail, readiness checks, and the host side of the typed Health
bridge. It imports `@apps/health/public-contract` only. It never imports
`apps/health/src/**` or `apps/health/app/**`.

### Health

Health owns system-sampling policy, Windows collectors, thresholds, presenters,
API, and dashboard UI. It does not read Control internals. Control browser-tab
counts arrive through a versioned public DTO and a narrow `postMessage` bridge.

### Shared code

No new package is created. Existing packages receive only stable technical
surface changes:

- `foundation/constants`: the `health` app identifier;
- `platform/config`: the known local runtime/base URL;
- `integration/api-contracts`: a small host-health bridge DTO;
- root alias/smoke registration required by the manifest architecture.

No Health thresholds, collectors, presentation rules, or install behavior move
into a package.

## Installation and mutation model

Control defines an app-local `InstallableAppDefinition` assembled from:

- the authoritative public manifest;
- a validated runtime project ID and base URL;
- presentation metadata owned by the host (glyph/accent);
- an allowlisted mutation ID.

V1 has one mutation: `control.smart-app-rail`. Installation state is versioned
and persisted under a Control-specific browser namespace. Unknown IDs are
discarded during normalization. Install/uninstall are idempotent.

Installing Health:

1. records `health` as installed;
2. activates `control.smart-app-rail` immediately;
3. adds the Health icon without starting Health;
4. offers an explicit Open action.

Opening Health:

1. selects the Health view model;
2. asks the existing Control supervisor to start only the allowlisted `dev`
   action when it is not running;
3. shows a lightweight one-second transition;
4. checks the known base URL through a server-resolved readiness endpoint;
5. mounts exactly one iframe after readiness;
6. applies the Health accent/background to the Control shell.

Uninstalling Health removes it from the rail and returns to the Control surface.
It does not delete code or data. A running dev process remains under the explicit
terminal supervisor controls rather than being killed implicitly.

## Smart rail experience

The rail is a slim translucent strip on the left edge of the content stage. It:

- remains visually quiet at rest;
- expands on pointer hover or keyboard focus to reveal labels/actions;
- includes a Control/home target and installed app icons;
- indicates active, starting, ready, and failed states without relying on color;
- updates shell CSS variables from a fixed Control-owned palette;
- uses opacity/transform transitions only and honors reduced motion;
- never mounts hidden app iframes.

The existing terminal dock remains global. The primary Control navigation stays
available when the Control surface is active and becomes visually secondary when
an external app is open.

## Health architecture

### Domain

`apps/health/src/domain/` defines snapshots, process readings, sensor
availability, and deterministic status thresholds. It has no React, Next.js,
PowerShell, Electron, or filesystem dependency.

### Application

A snapshot use case combines a lightweight system sampler and a cached Windows
details sampler. It returns domain data and never formats labels for the UI.

### Integration

- Node `os` provides memory, uptime, CPU ticks, and platform metadata.
- A bounded PowerShell adapter obtains top processes and attempts the ACPI
  thermal-zone reading.
- Process details are cached for several seconds; temperature is cached longer.
- Commands are fixed in code, run hidden, have timeouts and output limits, and
  accept no browser-provided shell fragments.
- Missing/unsupported temperature is reported as unavailable, never invented.

### Presentation

Presenters convert snapshots to view models with formatted sizes, percentages,
labels, severities, and unavailable states. React components consume only these
view models.

### API

`GET /api/system/snapshot` is loopback-oriented, dynamic, uncached by HTTP, and
returns a value-only snapshot. It exposes no environment variables, paths,
command lines, or process arguments.

## Host bridge

The Control desktop bridge gains a read-only command that returns only:

- open Control browser tabs;
- suspended Control browser tabs;
- sample timestamp and contract version.

Control forwards that DTO to the active Health iframe with `postMessage`. Both
sides validate message type, version, source window, and exact local origins.
No generic invoke channel, token, filesystem path, browser URL, or tab title is
exposed to Health.

In web-only Control, the Health dashboard marks Control tab metrics as
unavailable while all OS metrics continue working.

## Memory and performance budget

- no system-information dependency is added; Node and bounded PowerShell are
  sufficient for V1;
- only one external iframe is mounted;
- Health is not started during Control boot or installation;
- lightweight metrics refresh every second;
- process inventory refreshes no more often than every five seconds;
- temperature refreshes no more often than every thirty seconds;
- polling pauses while the Health document is hidden;
- the rail uses CSS transitions and no animation loop;
- process lists are capped at twelve rows and command output is bounded.

## Failure handling

- unknown/uninstalled app: reject selection and keep Control active;
- runtime start failure: show a retry action and retain terminal diagnostics;
- readiness timeout: show a non-destructive timeout state;
- Health API failure: keep the last good snapshot, mark it stale, and retry with
  bounded backoff;
- PowerShell timeout/invalid JSON: keep lightweight metrics and mark detailed
  readings unavailable;
- missing thermal sensor: render `Não disponível neste hardware`;
- invalid host bridge message: ignore it;
- storage corruption: normalize to the default empty installation state.

## Testing

### Control

- installation normalization and idempotency;
- install/uninstall/open state transitions;
- presenter mutation/rail visibility;
- readiness endpoint allowlists IDs and URLs;
- desktop command parser accepts only the read-only Health command;
- host bridge origin/source validation;
- shell never renders more than one external frame.

### Health

- CPU delta and memory calculations;
- thresholds and unavailable sensor states;
- bounded/cached Windows sampler behavior;
- presenter formatting;
- snapshot route success and degraded responses;
- host DTO validation and stale-state behavior.

### Required validation

```powershell
corepack pnpm --filter @matriz/app-matriz-control test
corepack pnpm --filter @matriz/app-matriz-control lint
corepack pnpm --filter @matriz/app-matriz-control typecheck
corepack pnpm --filter @matriz/app-matriz-control build
corepack pnpm --filter @matriz/app-health test
corepack pnpm --filter @matriz/app-health lint
corepack pnpm --filter @matriz/app-health typecheck
corepack pnpm --filter @matriz/app-health build
corepack pnpm test:smoke
corepack pnpm test:boundaries
```

## Incremental delivery

1. Health app skeleton, manifest registration, contracts, and pure sampling.
2. Health API, presenter, dashboard, and Windows process/temperature details.
3. Control installation domain, Store, and smart rail mutation.
4. Lazy runtime activation and single-frame host surface.
5. Read-only desktop tab bridge, hardening, visual polish, and validation.

## Boundary risks

The main risks are changes to root aliases, app IDs, runtime configuration,
public DTOs, and Hub registry counts. They are necessary because Health becomes
a first-class app and therefore require smoke and boundary tests. All product
logic remains app-local; no app imports another app's internals; no secret,
`.env`, runtime log, screenshot, build output, or cache artifact is committed.

## Review triggers

Revisit the design when a second host consumes mutations, an app needs a new
shell slot, remote code installation enters scope, more than one external app
must remain live, or non-Windows system collectors become real requirements.
