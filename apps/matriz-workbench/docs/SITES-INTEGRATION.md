# Sites integration

`apps/sites` is an independent app and the seventh registered application. It
owns the rendering runtime, site schemas, presets and site-local content.

The first `example` site proves:

- pt-BR and English messages with controlled locale fallback;
- local assets;
- semantic metadata, canonical, Open Graph, Twitter and icons;
- sitemap and robots;
- reusable metadata presets;
- catalog and preview routes.

## Workbench projection

The Workbench reads a safe summary through an app-local bridge. It does not
import Sites internals and does not expose arbitrary config editing.

A metadata proposal:

1. validates that the site exists;
2. creates a backlog item with `{ kind: "site", id }`;
3. links the exact `site.json`;
4. queues a Codex request;
5. leaves the source untouched until a reviewed Codex diff is approved.

Tags such as `site:example` remain useful for search, but `workScope` is the
structural source of truth.

