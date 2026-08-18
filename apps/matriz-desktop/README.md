# Matriz Control

## Ownership (L9)

- **Responsibility:** Windows-native developer utility for safe local Matriz
  process, port and workspace operations.
- **Exposes:** `public-contract.ts` with the app manifest only.
- **Does not expose:** Win32 primitives, command execution, filesystem access or
  desktop UI internals.
- **May import:** public domain-free `@matriz/*` contracts and design packages.
- **Must not import:** another app's `src/**` or `app/**`.

The desktop runtime is app-local. No shared package is justified until a second
native consumer exists.
