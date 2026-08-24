# Matriz Hub Alpha — Cycle 3 Implementation Plan

## Goal

Transform session-scoped events and telemetry plus onboarding and feature flags into a coherent operational area with truthful origin and persistence states.

## Scope

Only `apps/matriz-hub/**` and this plan. Existing stores and APIs remain the source of truth. No persistence upgrades in this cycle.

## Tasks

1. Create and test an operational presenter that normalizes EventBus and telemetry envelopes, humanizes technical labels without removing them, sorts activity by time, and summarizes state by source/app.
2. Replace `/events` with an activity stream that states `session` persistence, source app, envelope version and payload availability.
3. Replace `/telemetry` with app/source lanes, category context, filters that retain URL behavior, and explicit empty/filtered states.
4. Replace `/onboarding-status` with progress-oriented human actions and local-store persistence disclosure.
5. Replace `/feature-flags` with capability controls, tenant/app context, technical keys and explicit mock persistence.
6. Keep the global dock truthful; expose only facts that can be read without inventing live system metrics.
7. Run scoped tests, typecheck, lint and browser QA on all four routes at desktop and mobile sizes.

## Done criteria

- Technical terms are secondary to human meaning.
- Every operational route declares source and persistence.
- Empty activity remains empty instead of being seeded for appearance.
- Existing query filters and APIs remain functional.
- No other app or shared package is changed.
