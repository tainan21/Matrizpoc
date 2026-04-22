// @ts-check
/**
 * Shared ESLint helpers. The root eslint.config.js at the monorepo root
 * is the canonical config with L4 rules; this package exists so that
 * individual apps can extend/augment it later if needed.
 */
export { default as matrizRootConfig } from "../../eslint.config.mjs"
