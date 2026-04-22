# @matriz/eslint-config

Shared ESLint configuration for the Matriz monorepo.

The canonical config lives at the root `eslint.config.js`. This package is a
placeholder for app-specific overrides, if any are ever needed.

## Enforced Architectural Laws

- **L4** — cross-app import restrictions.
- **L6** — UI cannot import raw domain entities; presenters are mandatory.
- **L12** — shared packages cannot depend on apps.

See `docs/architectural-laws.md`.
