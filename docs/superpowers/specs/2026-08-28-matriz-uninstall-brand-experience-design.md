# Matriz Uninstall — Brand and Product Experience

## Decision

Matriz Uninstall is an official extension of Matriz Control. It inherits the Control typography, violet identity, dense operational language and continuous desktop surfaces. It adds a mineral-green functional accent for verified safety, recovery and released space. Tauri is the primary edition; Electron is a compatibility edition.

## Identity

The mark combines the Matriz `M` construction with a reversible open cycle. It must remain legible at 16 px, avoid trash-can symbolism, and work in violet/green, monochrome light and monochrome dark variants. Source assets are deterministic SVG. Windows/Tauri raster sizes and ICO are generated from that source.

Deliverables live in `apps/matriz-uninstall/assets/brand/` and include the symbol, horizontal lockup, monochrome variants, app icons, installer header/sidebar artwork and a concise usage guide. Generated raster illustration is optional; no generated bitmap may replace the vector identity.

## Product surface

The app fills the native window without an outer frame or centered container. Its structure is:

1. compact product bar with brand, runtime, theme and inspection action;
2. tab strip for Products, Updates, Cleanup and Activity;
3. filter rail on the left;
4. continuous product list/workspace in the center;
5. contextual inspector on the right;
6. status strip with catalog, connectivity, trust and last inspection.

Cards are used only for actionable overlays. Routine content uses rows, dividers and typographic hierarchy. Dark is the default; light and high-contrast themes use the same semantic tokens. Motion is limited to tab transitions, inspector reveal and operation progress, and respects reduced-motion preferences.

## Functional language

Copy distinguishes installed, available, outdated, unavailable and inconsistent states. Every destructive confirmation names the product, explains preserved data and lists the exact category of affected files. Installer/update/reinstall/cleanup flows expose progress, trust, version and recovery guidance. No success is shown before the native gateway confirms it.

## Matriz Control Store

The Store exposes Matriz Uninstall Tauri as recommended and Electron as compatibility. It uses the existing manifest/catalog/store contracts and never imports Uninstall internals. Products without a published signed release remain visible but unavailable. The Store explains that stable installation requires a signed catalog release.

## Packaging

Tauri and Electron consume their own identifiers but share renderer and identity. NSIS metadata, icons, names, descriptions and installer artwork match the brand. Local unsigned packages remain development artifacts; production stable requires Authenticode and a signed manifest.

## Quality bar

Acceptance requires app tests, scoped typecheck/lint, Rust tests, smoke/boundary checks, both Windows packages, visual inspection at desktop and narrow widths, and verification that tracked files contain no build output. The existing installation domain and gateway safety rules remain unchanged.
