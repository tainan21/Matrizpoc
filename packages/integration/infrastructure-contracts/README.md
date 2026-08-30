# Infrastructure Contracts

Technical, domain-neutral validation for `apps/<app>/infrastructure.json`.

- **Responsibility:** versioned types, Zod validation, JSON Schema and deterministic catalog checks.
- **Consumers:** Matriz Control, CI and project factory.
- **Does not own:** application commands, runtime paths, secrets, event names, migrations or product rules.
- **Allowed imports:** foundation schemas and Zod.
- **Forbidden imports:** any `apps/*` path or product-domain package.

The contract contains declarations only. Values and absolute machine paths are forbidden. Event names remain authoritative in each app's manifest.
