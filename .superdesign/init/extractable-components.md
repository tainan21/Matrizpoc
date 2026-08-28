# Extractable Components

## OpsSidebarShell

- Source: `apps/matriz-ops/src/ui/AppShell.tsx`
- Category: layout
- Description: sticky dark sidebar, Matriz Ops identity, manifest-driven navigation, local/cloud state and operational header.
- Extractable props: `activePath` (string, default `/`), `environmentLabel` (string, default `Ambiente local`), `environmentStatus` (string, default `healthy`), `pageEyebrow` (string), `pageTitle` (string).
- Hardcoded: product name, route labels/order, violet Matriz palette, Hub link, spacing and sidebar geometry.

The metric, panel, table and pill primitives remain inline for the first prototype because they are small and still evolving.
