# Matriz Control Workspace Resources Design

## Scope

This slice adds two connected surfaces to `apps/matriz-desktop`: Environment
Manager and Files & Assets Explorer. Both consume one app-local native resource
boundary. No shared package, arbitrary filesystem command or app-internal import
is introduced.

## Product model

The durable workspace remains the root selected by `OperationsState`. A catalog
`DesktopAppId` resolves to a known repository directory. A resource is always
addressed by `{ appId, relativePath }`; React never submits an absolute path.

The Control navigation gains one `Workspace` mode with `Ambientes` and
`Arquivos` sub-surfaces. Both reuse the runtime catalog as the app selector and
publish non-sensitive summaries into `ActivityHub`.

## Native resource boundary

Rust owns `WorkspaceResourceService` and performs every filesystem operation.
It resolves the app directory from the catalog, canonicalizes existing targets,
rejects traversal and symlink escapes, applies byte/count limits and returns
typed view models. New or renamed targets must have a canonical in-bound parent
and a single safe filename.

Allowed operations are exact commands: list environments, read environment,
reveal one value, save environment, list directory, preview file, open in the
configured editor, reveal in Explorer, rename, duplicate and move to the Windows
Recycle Bin. Permanent deletion is not exposed.

## Environment documents

Supported filenames are `.env`, `.env.local`, `.env.development`,
`.env.staging`, `.env.production` and `.env.example`. The parser preserves
comments, blank lines and ordering. Keys must match `[A-Za-z_][A-Za-z0-9_]*`.
The first version does not execute interpolation, command substitution or
generated scripts.

`read_environment` returns variable metadata and non-sensitive values. A value
is sensitive when its key contains `SECRET`, `TOKEN`, `PASSWORD`, `PRIVATE`,
`API_KEY`, `DATABASE_URL`, `DSN` or `CREDENTIAL`. Sensitive values cross IPC
only through an explicit `reveal_environment_value(appId, fileName, key)` call
and are never published to Activity, logs or agent context.

Every read returns a SHA-256 revision. Save requires the same revision, validates
the complete document, enforces 256 variables / 256 KiB, writes a temporary file
and atomically replaces the original. `.env.example` defines required keys for
validation; values are never compared or recorded.

`Apply & Restart` is a UI composition: save first, then invoke the existing
`restartRuntime` only when ownership is managed. External runtimes remain
protected and receive an explicit “saved; restart externally” state.

## Explorer

Directory results contain name, relative path, kind, extension, byte size and
modified timestamp. Entries are sorted folders first, then names. Hidden build
and dependency directories (`node_modules`, `.git`, `.next`, `.turbo`,
`target`) are omitted by default to keep traversal bounded.

Text preview accepts UTF-8 files up to 256 KiB. Raster/SVG preview accepts PNG,
JPG/JPEG, WEBP, GIF and SVG up to 8 MiB and returns a bounded data URL. Other
files expose metadata and native open/reveal actions only. The explorer is a
companion to an editor, not an editing surface.

Rename and duplicate require safe names and refuse overwrites. Delete moves the
target to the Windows Recycle Bin after renderer confirmation. Root directories,
workspace markers and `.env*` files cannot be deleted from Explorer; environment
files are managed only by Environment Manager.

## UI and visual behavior

The surface preserves the current Control shell, compact uppercase navigation,
near-black glass panels, purple focus, precise 1px borders and operational state
colors. At wide sizes it uses app rail → content → inspector. At compact sizes
the inspector becomes an inline lower panel and the app rail collapses.

ENV uses environment list, dense variable table and contextual inspector. Values
are masked by default and reveal is per row. Explorer uses breadcrumb, directory
list/grid and one preview inspector. Primary actions have loading, empty, error,
disabled and confirmation states; there are no decorative controls.

## Testing and acceptance

Rust tests cover catalog resolution, traversal/symlink escape, supported env
names, parser round-trip, secret classification, revision conflicts, atomic save,
size limits, directory filtering, preview limits and destructive protections.
Frontend tests cover view models, secret reveal lifecycle, unsaved state,
Apply & Restart ownership behavior, breadcrumbs, preview states and destructive
confirmation. Existing contract inventory, Tauri gateway and acceptance tests
remain green. Visual validation covers wide and compact windows in the real
Control renderer.

## Deliberate exclusions

No cloud secrets service, secret synchronization, code reference indexing,
full code editor, arbitrary upload, permanent deletion, filesystem watchers or
agent ingestion of values enters this slice. Import/export dialogs can follow
after the native dialog capability receives its own scoped security review.
