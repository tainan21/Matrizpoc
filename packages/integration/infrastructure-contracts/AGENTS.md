# Infrastructure Contracts — Agent Rules

## Responsibility

Versioned, domain-neutral types, Zod validation, JSON Schema and deterministic
helpers for `apps/<app>/infrastructure.json`.

## Allowed

- validation and types;
- deterministic cross-contract consistency checks;
- imports from `foundation/*` and Zod;
- changes backed by consumers in Control, CI or project factory.

## Forbidden

- imports from `apps/*`;
- runtime commands, executable paths, URLs with secrets or environment values;
- app-specific domain rules, repositories, migrations or event names;
- filesystem/network/process side effects.

Accepted: validate port uniqueness. Rejected: decide how Control invokes
`pg_ctl` or embed a database password.
