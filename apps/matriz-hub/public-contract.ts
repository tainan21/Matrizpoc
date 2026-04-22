/**
 * Matriz Hub — PUBLIC CONTRACT (manifest-only barrel, L2/L3).
 *
 * This is the ONLY file in this app that other apps are allowed to import.
 * It MUST NOT re-export anything from src/domain, src/application, src/ui,
 * src/integration, src/state, src/mock or src/api.
 *
 * ESLint enforces the cross-app restriction via `no-restricted-imports`.
 */
export { manifest } from "./src/manifest/manifest"
export type { MatrizHubManifest } from "./src/manifest/manifest"
