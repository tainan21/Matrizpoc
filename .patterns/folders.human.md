# Project folder map

Generated: 2026-08-12T16:44:35.376Z

## Reading guide

- Every displayed item is a directory; no project files were inspected.
- Labels are structural inferences from folder names, not claims about file contents.
- 479 directories mapped across 12 root areas.

## High-signal structure

- `.github/` - workspace-area; 1 descendant directories.
- `.matriz/` - workspace-area; 8 descendant directories.
- `apps/` - application-portfolio; 360 descendant directories.
- `backlog/` - workspace-area; 2 descendant directories.
- `docs/` - documentation; 9 descendant directories.
- `emails/` - email-templates; 0 descendant directories.
- `i18n/` - localization; 0 descendant directories.
- `packages/` - shared-package-portfolio; 79 descendant directories.
- `prisma/` - database-schema; 2 descendant directories.
- `scripts/` - automation; 0 descendant directories.
- `tests/` - quality-assurance; 1 descendant directories.
- `tooling/` - developer-tooling; 5 descendant directories.

## Detected boundaries

### Applications

- `apps/contracts/` - 29 descendants; direct areas: `.matriz/`, `app/`, `docs/`, `src/`.
- `apps/extensions/` - 0 descendants; direct areas: none.
- `apps/matriz-hub/` - 124 descendants; direct areas: `.matriz/`, `app/`, `docs/`, `public/`, `src/`.
- `apps/matriz-workbench/` - 93 descendants; direct areas: `.matriz/`, `app/`, `docs/`, `src/`.
- `apps/seumei/` - 29 descendants; direct areas: `.matriz/`, `app/`, `docs/`, `src/`.
- `apps/sites/` - 22 descendants; direct areas: `.matriz/`, `app/`, `docs/`, `public/`, `sites/`, `src/`.
- `apps/spot/` - 29 descendants; direct areas: `.matriz/`, `app/`, `docs/`, `src/`.
- `apps/willdash/` - 26 descendants; direct areas: `.matriz/`, `app/`, `docs/`, `src/`.

### Shared package groups

- `packages/access/` - 4 descendants; direct areas: `permissions/`, `tenants/`.
- `packages/design/` - 4 descendants; direct areas: `system/`, `ui/`.
- `packages/flows/` - 8 descendants; direct areas: `auth/`, `ecosystem/`, `onboarding/`, `praticies/`.
- `packages/foundation/` - 8 descendants; direct areas: `constants/`, `schemas/`, `types/`, `utils/`.
- `packages/integration/` - 16 descendants; direct areas: `api-contracts/`, `events/`, `external-links/`, `ingestion/`, `manifests/`, `registry-core/`.
- `packages/platform/` - 33 descendants; direct areas: `auth/`, `config/`, `db/`, `env/`, `i18n/`, `notifications/`, `pdf/`, `storage/`, `telemetry/`.

## Detected architectural layers

- `source-root`: 172 directories
- `route-layer`: 170 directories
- `documentation`: 85 directories
- `api-surface`: 71 directories
- `integration-layer`: 36 directories
- `presentation-layer`: 19 directories
- `domain-layer`: 17 directories
- `test-double`: 11 directories
- `application-layer`: 10 directories
- `repository-abstraction`: 10 directories
- `ui-components`: 8 directories
- `composition-root`: 7 directories
- `static-assets`: 7 directories
- `view-model-adapter`: 5 directories
- `database-schema`: 4 directories
- `library`: 4 directories
- `configuration`: 3 directories
- `schema-definition`: 3 directories
- `manifest-registry`: 2 directories
- `quality-assurance`: 2 directories
- `utility`: 2 directories
- `ui-hooks`: 1 directories

## Complete directory tree

```text
./ - directory | 479 descendants
+- .github/ - workspace-area | 1 descendants
|  \- workflows/ - directory | 0 descendants
+- .matriz/ - workspace-area | 8 descendants
|  +- activity/ - directory | 0 descendants
|  +- adoption-policies/ - directory | 0 descendants
|  +- backlog/ - directory | 0 descendants
|  +- control/ - directory | 1 descendants
|  |  \- snippets/ - directory | 0 descendants
|  \- docs/ - directory | documentation | 2 descendants
|      +- decisions/ - directory | documentation | 0 descendants
|      \- technical/ - directory | documentation | 0 descendants
+- apps/ - application-portfolio | 360 descendants
|  +- contracts/ - directory | app-boundary | 29 descendants
|  |  +- .matriz/ - directory | app-boundary | 4 descendants
|  |  |  +- activity/ - directory | app-boundary | 0 descendants
|  |  |  +- backlog/ - directory | app-boundary | 0 descendants
|  |  |  \- control/ - directory | app-boundary | 1 descendants
|  |  |      \- snippets/ - directory | app-boundary | 0 descendants
|  |  +- app/ - directory | app-boundary | route-layer | 4 descendants
|  |  |  +- contracts/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  +- login/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  +- onboarding/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  \- templates/ - directory | app-boundary | route-layer | 0 descendants
|  |  +- docs/ - directory | app-boundary | documentation | 0 descendants
|  |  \- src/ - directory | app-boundary | source-root | 17 descendants
|  |      +- application/ - directory | app-boundary | application-layer | source-root | 0 descendants
|  |      +- auth/ - directory | app-boundary | source-root | 0 descendants
|  |      +- bootstrap/ - directory | app-boundary | composition-root | source-root | 0 descendants
|  |      +- domain/ - directory | app-boundary | domain-layer | source-root | 2 descendants
|  |      |  +- models/ - directory | app-boundary | domain-layer | source-root | 0 descendants
|  |      |  \- repositories/ - directory | app-boundary | domain-layer | repository-abstraction | source-root | 0 descendants
|  |      +- domains/ - directory | app-boundary | source-root | 2 descendants
|  |      |  \- login/ - directory | app-boundary | source-root | 1 descendants
|  |      |      \- presentation/ - directory | app-boundary | source-root | 0 descendants
|  |      +- integration/ - directory | app-boundary | integration-layer | source-root | 1 descendants
|  |      |  \- adapters/ - directory | app-boundary | integration-layer | source-root | 0 descendants
|  |      +- lib/ - directory | app-boundary | library | source-root | 0 descendants
|  |      +- manifest/ - directory | app-boundary | source-root | 0 descendants
|  |      +- mock/ - directory | app-boundary | source-root | test-double | 0 descendants
|  |      \- ui/ - directory | app-boundary | presentation-layer | source-root | 2 descendants
|  |          +- components/ - directory | app-boundary | presentation-layer | source-root | ui-components | 0 descendants
|  |          \- presenters/ - directory | app-boundary | presentation-layer | source-root | view-model-adapter | 0 descendants
|  +- extensions/ - directory | app-boundary | 0 descendants
|  +- matriz-hub/ - directory | app-boundary | 124 descendants
|  |  +- .matriz/ - directory | app-boundary | 4 descendants
|  |  |  +- activity/ - directory | app-boundary | 0 descendants
|  |  |  +- backlog/ - directory | app-boundary | 0 descendants
|  |  |  \- control/ - directory | app-boundary | 1 descendants
|  |  |      \- snippets/ - directory | app-boundary | 0 descendants
|  |  +- app/ - directory | app-boundary | route-layer | 85 descendants
|  |  |  +- api/ - directory | api-surface | app-boundary | route-layer | 43 descendants
|  |  |  |  +- auth/ - directory | api-surface | app-boundary | route-layer | 6 descendants
|  |  |  |  |  \- mock/ - directory | api-surface | app-boundary | route-layer | test-double | 5 descendants
|  |  |  |  |      +- challenge/ - directory | api-surface | app-boundary | route-layer | test-double | 0 descendants
|  |  |  |  |      +- email/ - directory | api-surface | app-boundary | route-layer | test-double | 0 descendants
|  |  |  |  |      +- google/ - directory | api-surface | app-boundary | route-layer | test-double | 0 descendants
|  |  |  |  |      +- session/ - directory | api-surface | app-boundary | route-layer | test-double | 0 descendants
|  |  |  |  |      \- verify/ - directory | api-surface | app-boundary | route-layer | test-double | 0 descendants
|  |  |  |  +- docs/ - directory | api-surface | app-boundary | documentation | route-layer | 20 descendants
|  |  |  |  |  +- context-packages/ - directory | api-surface | app-boundary | documentation | route-layer | 2 descendants
|  |  |  |  |  |  \- [id]/ - directory | api-surface | app-boundary | documentation | route-layer | 1 descendants
|  |  |  |  |  |      \- publish/ - directory | api-surface | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  |  +- conversions/ - directory | api-surface | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  |  +- documents/ - directory | api-surface | app-boundary | documentation | route-layer | 2 descendants
|  |  |  |  |  |  \- [docId]/ - directory | api-surface | app-boundary | documentation | route-layer | 1 descendants
|  |  |  |  |  |      \- versions/ - directory | api-surface | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  |  +- entities/ - directory | api-surface | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  |  +- exports/ - directory | api-surface | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  |  +- governance/ - directory | api-surface | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  |  +- imports/ - directory | api-surface | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  |  +- mcp/ - directory | api-surface | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  |  +- relations/ - directory | api-surface | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  |  +- runs/ - directory | api-surface | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  |  +- suggestions/ - directory | api-surface | app-boundary | documentation | route-layer | 3 descendants
|  |  |  |  |  |  \- [id]/ - directory | api-surface | app-boundary | documentation | route-layer | 2 descendants
|  |  |  |  |  |      +- accept/ - directory | api-surface | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  |  |      \- reject/ - directory | api-surface | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  |  +- tasks/ - directory | api-surface | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  |  \- timeline/ - directory | api-surface | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  +- ecosystem/ - directory | api-surface | app-boundary | route-layer | 2 descendants
|  |  |  |  |  +- cache/ - directory | api-surface | app-boundary | route-layer | 0 descendants
|  |  |  |  |  \- health/ - directory | api-surface | app-boundary | route-layer | 0 descendants
|  |  |  |  +- events/ - directory | api-surface | app-boundary | route-layer | 0 descendants
|  |  |  |  +- external-links/ - directory | api-surface | app-boundary | route-layer | 0 descendants
|  |  |  |  +- feature-flags/ - directory | api-surface | app-boundary | route-layer | 0 descendants
|  |  |  |  +- institutional/ - directory | api-surface | app-boundary | route-layer | 1 descendants
|  |  |  |  |  \- refresh/ - directory | api-surface | app-boundary | route-layer | 0 descendants
|  |  |  |  +- mcp/ - directory | api-surface | app-boundary | route-layer | 0 descendants
|  |  |  |  +- onboarding-status/ - directory | api-surface | app-boundary | route-layer | 0 descendants
|  |  |  |  +- praticies/ - directory | api-surface | app-boundary | route-layer | 2 descendants
|  |  |  |  |  \- patterns/ - directory | api-surface | app-boundary | route-layer | 1 descendants
|  |  |  |  |      \- [format]/ - directory | api-surface | app-boundary | route-layer | 0 descendants
|  |  |  |  +- registry/ - directory | api-surface | app-boundary | route-layer | 0 descendants
|  |  |  |  \- telemetry/ - directory | api-surface | app-boundary | route-layer | 0 descendants
|  |  |  +- audit/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  +- catalog/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  +- docs/ - directory | app-boundary | documentation | route-layer | 23 descendants
|  |  |  |  +- [docId]/ - directory | app-boundary | documentation | route-layer | 4 descendants
|  |  |  |  |  +- edit/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  |  +- graph/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  |  +- timeline/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  |  \- versions/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  +- approvals/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  +- context/ - directory | app-boundary | documentation | route-layer | 1 descendants
|  |  |  |  |  \- [contextId]/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  +- converter/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  +- entities/ - directory | app-boundary | documentation | route-layer | 1 descendants
|  |  |  |  |  \- [entityId]/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  +- exports/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  +- governance/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  +- graph/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  +- import/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  +- mcp/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  +- new/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  +- review-desk/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  +- runs/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  +- settings/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  +- suggestions/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  +- tasks/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  \- timeline/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  +- ecosystem/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  +- events/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  +- external-links/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  +- feature-flags/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  +- health/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  +- intelligence/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  +- login/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  +- onboarding-status/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  +- praticies/ - directory | app-boundary | route-layer | 1 descendants
|  |  |  |  \- apps/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  +- projects/ - directory | app-boundary | route-layer | 1 descendants
|  |  |  |  \- [id]/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  +- public/ - directory | app-boundary | route-layer | static-assets | 0 descendants
|  |  |  +- registry/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  \- telemetry/ - directory | app-boundary | route-layer | 0 descendants
|  |  +- docs/ - directory | app-boundary | documentation | 0 descendants
|  |  +- public/ - directory | app-boundary | static-assets | 1 descendants
|  |  |  \- audit/ - directory | app-boundary | static-assets | 0 descendants
|  |  \- src/ - directory | app-boundary | source-root | 29 descendants
|  |      +- auth/ - directory | app-boundary | source-root | 0 descendants
|  |      +- bootstrap/ - directory | app-boundary | composition-root | source-root | 0 descendants
|  |      +- domains/ - directory | app-boundary | source-root | 17 descendants
|  |      |  +- docs/ - directory | app-boundary | documentation | source-root | 7 descendants
|  |      |  |  +- application/ - directory | app-boundary | application-layer | documentation | source-root | 0 descendants
|  |      |  |  +- domain/ - directory | app-boundary | documentation | domain-layer | source-root | 0 descendants
|  |      |  |  +- integration/ - directory | app-boundary | documentation | integration-layer | source-root | 2 descendants
|  |      |  |  |  +- converters/ - directory | app-boundary | documentation | integration-layer | source-root | 0 descendants
|  |      |  |  |  \- prisma/ - directory | app-boundary | database-schema | documentation | integration-layer | source-root | 0 descendants
|  |      |  |  +- mcp/ - directory | app-boundary | documentation | source-root | 0 descendants
|  |      |  |  \- presentation/ - directory | app-boundary | documentation | source-root | 0 descendants
|  |      |  +- login/ - directory | app-boundary | source-root | 1 descendants
|  |      |  |  \- presentation/ - directory | app-boundary | source-root | 0 descendants
|  |      |  \- praticies/ - directory | app-boundary | source-root | 6 descendants
|  |      |      +- application/ - directory | app-boundary | application-layer | source-root | 0 descendants
|  |      |      +- domain/ - directory | app-boundary | domain-layer | source-root | 1 descendants
|  |      |      |  \- repositories/ - directory | app-boundary | domain-layer | repository-abstraction | source-root | 0 descendants
|  |      |      +- integration/ - directory | app-boundary | integration-layer | source-root | 1 descendants
|  |      |      |  \- filesystem/ - directory | app-boundary | integration-layer | source-root | 0 descendants
|  |      |      \- presentation/ - directory | app-boundary | source-root | 0 descendants
|  |      +- ecosystem/ - directory | app-boundary | source-root | 0 descendants
|  |      +- institutional/ - directory | app-boundary | source-root | 3 descendants
|  |      |  +- components/ - directory | app-boundary | source-root | ui-components | 1 descendants
|  |      |  |  \- public/ - directory | app-boundary | source-root | static-assets | ui-components | 0 descendants
|  |      |  \- seeds/ - directory | app-boundary | source-root | 0 descendants
|  |      +- manifest/ - directory | app-boundary | source-root | 0 descendants
|  |      +- mcp/ - directory | app-boundary | source-root | 0 descendants
|  |      \- ui/ - directory | app-boundary | presentation-layer | source-root | 1 descendants
|  |          \- components/ - directory | app-boundary | presentation-layer | source-root | ui-components | 0 descendants
|  +- matriz-workbench/ - directory | app-boundary | 93 descendants
|  |  +- .matriz/ - directory | app-boundary | 11 descendants
|  |  |  +- activity/ - directory | app-boundary | 0 descendants
|  |  |  +- agents/ - directory | app-boundary | 2 descendants
|  |  |  |  +- requests/ - directory | app-boundary | 0 descendants
|  |  |  |  \- runs/ - directory | app-boundary | 0 descendants
|  |  |  +- backlog/ - directory | app-boundary | 0 descendants
|  |  |  +- control/ - directory | app-boundary | 1 descendants
|  |  |  |  \- snippets/ - directory | app-boundary | 0 descendants
|  |  |  \- docs/ - directory | app-boundary | documentation | 3 descendants
|  |  |      +- decisions/ - directory | app-boundary | documentation | 0 descendants
|  |  |      +- product/ - directory | app-boundary | documentation | 0 descendants
|  |  |      \- technical/ - directory | app-boundary | documentation | 0 descendants
|  |  +- app/ - directory | app-boundary | route-layer | 57 descendants
|  |  |  +- (workspace)/ - directory | app-boundary | route-layer | 28 descendants
|  |  |  |  +- control/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  |  +- knowledge/ - directory | app-boundary | route-layer | 1 descendants
|  |  |  |  |  \- [sourceId]/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  |  +- praticies/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  |  +- projects/ - directory | app-boundary | route-layer | 16 descendants
|  |  |  |  |  +- [projectId]/ - directory | app-boundary | route-layer | 14 descendants
|  |  |  |  |  |  +- activity/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  |  |  |  +- agents/ - directory | app-boundary | route-layer | 1 descendants
|  |  |  |  |  |  |  \- [requestId]/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  |  |  |  +- backlog/ - directory | app-boundary | route-layer | 1 descendants
|  |  |  |  |  |  |  \- [itemId]/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  |  |  |  +- collaboration/ - directory | app-boundary | route-layer | 2 descendants
|  |  |  |  |  |  |  +- github/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  |  |  |  |  \- notifications/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  |  |  |  +- decisions/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  |  |  |  +- dependencies/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  |  |  |  +- docs/ - directory | app-boundary | documentation | route-layer | 2 descendants
|  |  |  |  |  |  |  \- [kind]/ - directory | app-boundary | documentation | route-layer | 1 descendants
|  |  |  |  |  |  |      \- [slug]/ - directory | app-boundary | documentation | route-layer | 0 descendants
|  |  |  |  |  |  \- roadmap/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  |  |  \- new/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  |  +- settings/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  |  +- sites/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  |  \- work/ - directory | app-boundary | route-layer | 4 descendants
|  |  |  |      +- backlog/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  |      +- inbox/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  |      \- sprints/ - directory | app-boundary | route-layer | 1 descendants
|  |  |  |          \- [sprintId]/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  +- api/ - directory | api-surface | app-boundary | route-layer | 26 descendants
|  |  |  |  +- codex/ - directory | api-surface | app-boundary | route-layer | 10 descendants
|  |  |  |  |  +- projects/ - directory | api-surface | app-boundary | route-layer | 8 descendants
|  |  |  |  |  |  \- [projectId]/ - directory | api-surface | app-boundary | route-layer | 7 descendants
|  |  |  |  |  |      \- requests/ - directory | api-surface | app-boundary | route-layer | 6 descendants
|  |  |  |  |  |          \- [requestId]/ - directory | api-surface | app-boundary | route-layer | 5 descendants
|  |  |  |  |  |              +- approvals/ - directory | api-surface | app-boundary | route-layer | 1 descendants
|  |  |  |  |  |              |  \- [approvalId]/ - directory | api-surface | app-boundary | route-layer | 0 descendants
|  |  |  |  |  |              +- cancel/ - directory | api-surface | app-boundary | route-layer | 0 descendants
|  |  |  |  |  |              +- events/ - directory | api-surface | app-boundary | route-layer | 0 descendants
|  |  |  |  |  |              \- start/ - directory | api-surface | app-boundary | route-layer | 0 descendants
|  |  |  |  |  \- runtime/ - directory | api-surface | app-boundary | route-layer | 0 descendants
|  |  |  |  \- collaboration/ - directory | api-surface | app-boundary | route-layer | 14 descendants
|  |  |  |      \- projects/ - directory | api-surface | app-boundary | route-layer | 13 descendants
|  |  |  |          \- [projectId]/ - directory | api-surface | app-boundary | route-layer | 12 descendants
|  |  |  |              +- github/ - directory | api-surface | app-boundary | route-layer | 4 descendants
|  |  |  |              |  +- issues/ - directory | api-surface | app-boundary | route-layer | 1 descendants
|  |  |  |              |  |  \- [taskId]/ - directory | api-surface | app-boundary | route-layer | 0 descendants
|  |  |  |              |  \- pull-requests/ - directory | api-surface | app-boundary | route-layer | 1 descendants
|  |  |  |              |      \- [requestId]/ - directory | api-surface | app-boundary | route-layer | 0 descendants
|  |  |  |              +- notifications/ - directory | api-surface | app-boundary | route-layer | 3 descendants
|  |  |  |              |  +- config/ - directory | api-surface | app-boundary | configuration | route-layer | 0 descendants
|  |  |  |              |  \- outbox/ - directory | api-surface | app-boundary | route-layer | 1 descendants
|  |  |  |              |      \- [notificationId]/ - directory | api-surface | app-boundary | route-layer | 0 descendants
|  |  |  |              \- vercel/ - directory | api-surface | app-boundary | route-layer | 2 descendants
|  |  |  |                  \- previews/ - directory | api-surface | app-boundary | route-layer | 1 descendants
|  |  |  |                      \- [requestId]/ - directory | api-surface | app-boundary | route-layer | 0 descendants
|  |  |  \- unlock/ - directory | app-boundary | route-layer | 0 descendants
|  |  +- docs/ - directory | app-boundary | documentation | 4 descendants
|  |  |  +- agent-handbook/ - directory | app-boundary | documentation | 0 descendants
|  |  |  +- design/ - directory | app-boundary | documentation | 0 descendants
|  |  |  +- plans/ - directory | app-boundary | documentation | 0 descendants
|  |  |  \- specs/ - directory | app-boundary | documentation | 0 descendants
|  |  \- src/ - directory | app-boundary | source-root | 17 descendants
|  |      +- application/ - directory | app-boundary | application-layer | source-root | 2 descendants
|  |      |  +- collaboration/ - directory | app-boundary | application-layer | source-root | 0 descendants
|  |      |  \- http/ - directory | app-boundary | application-layer | source-root | 0 descendants
|  |      +- auth/ - directory | app-boundary | source-root | 0 descendants
|  |      +- bootstrap/ - directory | app-boundary | composition-root | source-root | 0 descendants
|  |      +- cli/ - directory | app-boundary | source-root | 0 descendants
|  |      +- domain/ - directory | app-boundary | domain-layer | source-root | 0 descendants
|  |      +- integration/ - directory | app-boundary | integration-layer | source-root | 4 descendants
|  |      |  +- codex/ - directory | app-boundary | integration-layer | source-root | 0 descendants
|  |      |  +- collaboration/ - directory | app-boundary | integration-layer | source-root | 0 descendants
|  |      |  +- filesystem/ - directory | app-boundary | integration-layer | source-root | 0 descendants
|  |      |  \- sites/ - directory | app-boundary | integration-layer | source-root | 0 descendants
|  |      +- manifest/ - directory | app-boundary | source-root | 0 descendants
|  |      +- mcp/ - directory | app-boundary | source-root | 0 descendants
|  |      \- ui/ - directory | app-boundary | presentation-layer | source-root | 2 descendants
|  |          +- components/ - directory | app-boundary | presentation-layer | source-root | ui-components | 0 descendants
|  |          \- presenters/ - directory | app-boundary | presentation-layer | source-root | view-model-adapter | 0 descendants
|  +- seumei/ - directory | app-boundary | 29 descendants
|  |  +- .matriz/ - directory | app-boundary | 3 descendants
|  |  |  +- activity/ - directory | app-boundary | 0 descendants
|  |  |  \- control/ - directory | app-boundary | 1 descendants
|  |  |      \- snippets/ - directory | app-boundary | 0 descendants
|  |  +- app/ - directory | app-boundary | route-layer | 4 descendants
|  |  |  +- establishments/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  +- login/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  +- onboarding/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  \- owners/ - directory | app-boundary | route-layer | 0 descendants
|  |  +- docs/ - directory | app-boundary | documentation | 0 descendants
|  |  \- src/ - directory | app-boundary | source-root | 18 descendants
|  |      +- application/ - directory | app-boundary | application-layer | source-root | 0 descendants
|  |      +- auth/ - directory | app-boundary | source-root | 0 descendants
|  |      +- bootstrap/ - directory | app-boundary | composition-root | source-root | 0 descendants
|  |      +- domain/ - directory | app-boundary | domain-layer | source-root | 2 descendants
|  |      |  +- models/ - directory | app-boundary | domain-layer | source-root | 0 descendants
|  |      |  \- repositories/ - directory | app-boundary | domain-layer | repository-abstraction | source-root | 0 descendants
|  |      +- domains/ - directory | app-boundary | source-root | 2 descendants
|  |      |  \- login/ - directory | app-boundary | source-root | 1 descendants
|  |      |      \- presentation/ - directory | app-boundary | source-root | 0 descendants
|  |      +- integration/ - directory | app-boundary | integration-layer | source-root | 2 descendants
|  |      |  +- adapters/ - directory | app-boundary | integration-layer | source-root | 0 descendants
|  |      |  \- gateways/ - directory | app-boundary | integration-layer | source-root | 0 descendants
|  |      +- lib/ - directory | app-boundary | library | source-root | 0 descendants
|  |      +- manifest/ - directory | app-boundary | source-root | 0 descendants
|  |      +- mock/ - directory | app-boundary | source-root | test-double | 0 descendants
|  |      \- ui/ - directory | app-boundary | presentation-layer | source-root | 2 descendants
|  |          +- components/ - directory | app-boundary | presentation-layer | source-root | ui-components | 0 descendants
|  |          \- presenters/ - directory | app-boundary | presentation-layer | source-root | view-model-adapter | 0 descendants
|  +- sites/ - directory | app-boundary | 22 descendants
|  |  +- .matriz/ - directory | app-boundary | 3 descendants
|  |  |  +- activity/ - directory | app-boundary | 0 descendants
|  |  |  \- control/ - directory | app-boundary | 1 descendants
|  |  |      \- snippets/ - directory | app-boundary | 0 descendants
|  |  +- app/ - directory | app-boundary | route-layer | 3 descendants
|  |  |  \- preview/ - directory | app-boundary | route-layer | 2 descendants
|  |  |      \- [siteId]/ - directory | app-boundary | route-layer | 1 descendants
|  |  |          \- [locale]/ - directory | app-boundary | route-layer | 0 descendants
|  |  +- docs/ - directory | app-boundary | documentation | 0 descendants
|  |  +- public/ - directory | app-boundary | static-assets | 2 descendants
|  |  |  \- sites/ - directory | app-boundary | static-assets | 1 descendants
|  |  |      \- example/ - directory | app-boundary | static-assets | 0 descendants
|  |  +- sites/ - directory | app-boundary | 3 descendants
|  |  |  +- _presets/ - directory | app-boundary | 0 descendants
|  |  |  \- example/ - directory | app-boundary | 1 descendants
|  |  |      \- messages/ - directory | app-boundary | 0 descendants
|  |  \- src/ - directory | app-boundary | source-root | 5 descendants
|  |      +- application/ - directory | app-boundary | application-layer | source-root | 0 descendants
|  |      +- bootstrap/ - directory | app-boundary | composition-root | source-root | 0 descendants
|  |      +- domain/ - directory | app-boundary | domain-layer | source-root | 0 descendants
|  |      +- integration/ - directory | app-boundary | integration-layer | source-root | 0 descendants
|  |      \- manifest/ - directory | app-boundary | source-root | 0 descendants
|  +- spot/ - directory | app-boundary | 29 descendants
|  |  +- .matriz/ - directory | app-boundary | 3 descendants
|  |  |  +- activity/ - directory | app-boundary | 0 descendants
|  |  |  \- control/ - directory | app-boundary | 1 descendants
|  |  |      \- snippets/ - directory | app-boundary | 0 descendants
|  |  +- app/ - directory | app-boundary | route-layer | 4 descendants
|  |  |  +- bands/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  +- gigs/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  +- login/ - directory | app-boundary | route-layer | 0 descendants
|  |  |  \- onboarding/ - directory | app-boundary | route-layer | 0 descendants
|  |  +- docs/ - directory | app-boundary | documentation | 0 descendants
|  |  \- src/ - directory | app-boundary | source-root | 18 descendants
|  |      +- application/ - directory | app-boundary | application-layer | source-root | 0 descendants
|  |      +- auth/ - directory | app-boundary | source-root | 0 descendants
|  |      +- bootstrap/ - directory | app-boundary | composition-root | source-root | 0 descendants
|  |      +- domain/ - directory | app-boundary | domain-layer | source-root | 2 descendants
|  |      |  +- models/ - directory | app-boundary | domain-layer | source-root | 0 descendants
|  |      |  \- repositories/ - directory | app-boundary | domain-layer | repository-abstraction | source-root | 0 descendants
|  |      +- domains/ - directory | app-boundary | source-root | 2 descendants
|  |      |  \- login/ - directory | app-boundary | source-root | 1 descendants
|  |      |      \- presentation/ - directory | app-boundary | source-root | 0 descendants
|  |      +- integration/ - directory | app-boundary | integration-layer | source-root | 2 descendants
|  |      |  +- adapters/ - directory | app-boundary | integration-layer | source-root | 0 descendants
|  |      |  \- gateways/ - directory | app-boundary | integration-layer | source-root | 0 descendants
|  |      +- lib/ - directory | app-boundary | library | source-root | 0 descendants
|  |      +- manifest/ - directory | app-boundary | source-root | 0 descendants
|  |      +- mock/ - directory | app-boundary | source-root | test-double | 0 descendants
|  |      \- ui/ - directory | app-boundary | presentation-layer | source-root | 2 descendants
|  |          +- components/ - directory | app-boundary | presentation-layer | source-root | ui-components | 0 descendants
|  |          \- presenters/ - directory | app-boundary | presentation-layer | source-root | view-model-adapter | 0 descendants
|  \- willdash/ - directory | app-boundary | 26 descendants
|      +- .matriz/ - directory | app-boundary | 1 descendants
|      |  \- activity/ - directory | app-boundary | 0 descendants
|      +- app/ - directory | app-boundary | route-layer | 6 descendants
|      |  +- activities/ - directory | app-boundary | route-layer | 0 descendants
|      |  +- dashboards/ - directory | app-boundary | route-layer | 0 descendants
|      |  +- goals/ - directory | app-boundary | route-layer | 0 descendants
|      |  +- login/ - directory | app-boundary | route-layer | 0 descendants
|      |  +- onboarding/ - directory | app-boundary | route-layer | 0 descendants
|      |  \- telemetry/ - directory | app-boundary | route-layer | 0 descendants
|      +- docs/ - directory | app-boundary | documentation | 0 descendants
|      \- src/ - directory | app-boundary | source-root | 15 descendants
|          +- application/ - directory | app-boundary | application-layer | source-root | 0 descendants
|          +- auth/ - directory | app-boundary | source-root | 0 descendants
|          +- bootstrap/ - directory | app-boundary | composition-root | source-root | 0 descendants
|          +- domain/ - directory | app-boundary | domain-layer | source-root | 2 descendants
|          |  +- models/ - directory | app-boundary | domain-layer | source-root | 0 descendants
|          |  \- repositories/ - directory | app-boundary | domain-layer | repository-abstraction | source-root | 0 descendants
|          +- domains/ - directory | app-boundary | source-root | 2 descendants
|          |  \- login/ - directory | app-boundary | source-root | 1 descendants
|          |      \- presentation/ - directory | app-boundary | source-root | 0 descendants
|          +- lib/ - directory | app-boundary | library | source-root | 0 descendants
|          +- manifest/ - directory | app-boundary | source-root | 0 descendants
|          +- mock/ - directory | app-boundary | source-root | test-double | 0 descendants
|          \- ui/ - directory | app-boundary | presentation-layer | source-root | 2 descendants
|              +- components/ - directory | app-boundary | presentation-layer | source-root | ui-components | 0 descendants
|              \- presenters/ - directory | app-boundary | presentation-layer | source-root | view-model-adapter | 0 descendants
+- backlog/ - workspace-area | 2 descendants
|  +- babylon/ - directory | 0 descendants
|  \- fundacao/ - directory | 0 descendants
+- docs/ - documentation | 9 descendants
|  +- adr/ - directory | documentation | 0 descendants
|  +- audit/ - directory | documentation | 3 descendants
|  |  \- assets/ - directory | documentation | 2 descendants
|  |      \- 2026-07-27/ - directory | documentation | 1 descendants
|  |          \- showcase/ - directory | documentation | 0 descendants
|  +- historico/ - directory | documentation | 0 descendants
|  \- superpowers/ - directory | documentation | 2 descendants
|      +- plans/ - directory | documentation | 0 descendants
|      \- specs/ - directory | documentation | 0 descendants
+- emails/ - email-templates | 0 descendants
+- i18n/ - localization | 0 descendants
+- packages/ - shared-package-portfolio | 79 descendants
|  +- access/ - directory | package-boundary | 4 descendants
|  |  +- permissions/ - directory | package-boundary | 1 descendants
|  |  |  \- src/ - directory | package-boundary | source-root | 0 descendants
|  |  \- tenants/ - directory | package-boundary | 1 descendants
|  |      \- src/ - directory | package-boundary | source-root | 0 descendants
|  +- design/ - directory | package-boundary | 4 descendants
|  |  +- system/ - directory | package-boundary | 1 descendants
|  |  |  \- src/ - directory | package-boundary | source-root | 0 descendants
|  |  \- ui/ - directory | package-boundary | presentation-layer | 1 descendants
|  |      \- src/ - directory | package-boundary | presentation-layer | source-root | 0 descendants
|  +- flows/ - directory | package-boundary | 8 descendants
|  |  +- auth/ - directory | package-boundary | 1 descendants
|  |  |  \- src/ - directory | package-boundary | source-root | 0 descendants
|  |  +- ecosystem/ - directory | package-boundary | 1 descendants
|  |  |  \- src/ - directory | package-boundary | source-root | 0 descendants
|  |  +- onboarding/ - directory | package-boundary | 1 descendants
|  |  |  \- src/ - directory | package-boundary | source-root | 0 descendants
|  |  \- praticies/ - directory | package-boundary | 1 descendants
|  |      \- src/ - directory | package-boundary | source-root | 0 descendants
|  +- foundation/ - directory | package-boundary | 8 descendants
|  |  +- constants/ - directory | package-boundary | 1 descendants
|  |  |  \- src/ - directory | package-boundary | source-root | 0 descendants
|  |  +- schemas/ - directory | package-boundary | schema-definition | 1 descendants
|  |  |  \- src/ - directory | package-boundary | schema-definition | source-root | 0 descendants
|  |  +- types/ - directory | package-boundary | 1 descendants
|  |  |  \- src/ - directory | package-boundary | source-root | 0 descendants
|  |  \- utils/ - directory | package-boundary | utility | 1 descendants
|  |      \- src/ - directory | package-boundary | source-root | utility | 0 descendants
|  +- integration/ - directory | integration-layer | package-boundary | 16 descendants
|  |  +- api-contracts/ - directory | integration-layer | package-boundary | 4 descendants
|  |  |  \- src/ - directory | integration-layer | package-boundary | source-root | 3 descendants
|  |  |      \- v1/ - directory | integration-layer | package-boundary | source-root | 2 descendants
|  |  |          +- docs/ - directory | documentation | integration-layer | package-boundary | source-root | 0 descendants
|  |  |          \- institutional/ - directory | integration-layer | package-boundary | source-root | 0 descendants
|  |  +- events/ - directory | integration-layer | package-boundary | 1 descendants
|  |  |  \- src/ - directory | integration-layer | package-boundary | source-root | 0 descendants
|  |  +- external-links/ - directory | integration-layer | package-boundary | 1 descendants
|  |  |  \- src/ - directory | integration-layer | package-boundary | source-root | 0 descendants
|  |  +- ingestion/ - directory | integration-layer | package-boundary | 2 descendants
|  |  |  \- src/ - directory | integration-layer | package-boundary | source-root | 1 descendants
|  |  |      \- adapters/ - directory | integration-layer | package-boundary | source-root | 0 descendants
|  |  +- manifests/ - directory | integration-layer | manifest-registry | package-boundary | 1 descendants
|  |  |  \- src/ - directory | integration-layer | manifest-registry | package-boundary | source-root | 0 descendants
|  |  \- registry-core/ - directory | integration-layer | package-boundary | 1 descendants
|  |      \- src/ - directory | integration-layer | package-boundary | source-root | 0 descendants
|  \- platform/ - directory | package-boundary | 33 descendants
|      +- auth/ - directory | package-boundary | 11 descendants
|      |  \- src/ - directory | package-boundary | source-root | 10 descendants
|      |      \- v1/ - directory | package-boundary | source-root | 9 descendants
|      |          +- guards/ - directory | package-boundary | source-root | 0 descendants
|      |          +- hooks/ - directory | package-boundary | source-root | ui-hooks | 0 descendants
|      |          +- mappers/ - directory | package-boundary | source-root | 0 descendants
|      |          +- mock/ - directory | package-boundary | source-root | test-double | 0 descendants
|      |          +- provider/ - directory | package-boundary | source-root | 0 descendants
|      |          +- server/ - directory | package-boundary | source-root | 0 descendants
|      |          +- services/ - directory | package-boundary | source-root | 0 descendants
|      |          +- storage/ - directory | package-boundary | source-root | 0 descendants
|      |          \- strategies/ - directory | package-boundary | source-root | 0 descendants
|      +- config/ - directory | configuration | package-boundary | 1 descendants
|      |  \- src/ - directory | configuration | package-boundary | source-root | 0 descendants
|      +- db/ - directory | package-boundary | 6 descendants
|      |  \- src/ - directory | package-boundary | source-root | 5 descendants
|      |      \- repositories/ - directory | package-boundary | repository-abstraction | source-root | 4 descendants
|      |          +- contracts/ - directory | package-boundary | repository-abstraction | source-root | 0 descendants
|      |          +- core/ - directory | package-boundary | repository-abstraction | source-root | 0 descendants
|      |          +- hub/ - directory | package-boundary | repository-abstraction | source-root | 0 descendants
|      |          \- seumei/ - directory | package-boundary | repository-abstraction | source-root | 0 descendants
|      +- env/ - directory | package-boundary | 1 descendants
|      |  \- src/ - directory | package-boundary | source-root | 0 descendants
|      +- i18n/ - directory | package-boundary | 1 descendants
|      |  \- src/ - directory | package-boundary | source-root | 0 descendants
|      +- notifications/ - directory | package-boundary | 1 descendants
|      |  \- src/ - directory | package-boundary | source-root | 0 descendants
|      +- pdf/ - directory | package-boundary | 1 descendants
|      |  \- src/ - directory | package-boundary | source-root | 0 descendants
|      +- storage/ - directory | package-boundary | 1 descendants
|      |  \- src/ - directory | package-boundary | source-root | 0 descendants
|      \- telemetry/ - directory | package-boundary | 1 descendants
|          \- src/ - directory | package-boundary | source-root | 0 descendants
+- prisma/ - database-schema | 2 descendants
|  +- migrations/ - directory | database-schema | 0 descendants
|  \- schemas/ - directory | database-schema | schema-definition | 0 descendants
+- scripts/ - automation | 0 descendants
+- tests/ - quality-assurance | 1 descendants
|  \- smoke/ - directory | contract-smoke-tests | quality-assurance | 0 descendants
\- tooling/ - developer-tooling | 5 descendants
    +- eslint-config/ - directory | 0 descendants
    +- scripts/ - directory | 0 descendants
    +- tailwind-preset/ - directory | 0 descendants
    +- tsconfig/ - directory | 0 descendants
    \- vitest-config/ - directory | 0 descendants
```

## Intentional exclusions

- `.git/` - Git metadata
- `.patterns/` - Mapper output (prevents self-inclusion)
- `.playwright-cli/` - browser automation state
- `.pnpm-store/` - pnpm package cache
- `.runtime/` - local runtime state
- `.snapshots/` - local snapshots
- `.superpowers/` - local tool state
- `.turbo/` - Turborepo cache
- `.worktrees/` - separate Git worktrees
- `.next/` - Next.js build output
- `node_modules/` - installed dependencies

Skipped symlinks: 0. Inaccessible directories: 0.
