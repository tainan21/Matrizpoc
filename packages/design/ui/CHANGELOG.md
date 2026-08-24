# Changelog

## Unreleased

### Governance

- Documented authorities for implementation, metadata, and stories; promotion,
  accessibility, deprecation, and public-import rules are now explicit.
- Local `@matriz/design-ui` is canonical in this monorepo. An external library
  remains reference-only until separately approved as portable adoption.

### Compatibility

- Public APIs and styles remain available during migrations. Removal happens
  only after a replacement, communication, and audited consumer migration.

Executable API history remains in Git, `src/metadata.ts`, and public exports.
This file does not turn internal variations into a contract.
