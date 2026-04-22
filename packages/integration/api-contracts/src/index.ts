/**
 * @matriz/integration-api-contracts
 *
 * Root barrel. Re-exports v1 as the default. Namespace "v1" is also exposed
 * explicitly for consumers that want to pin the version (L7).
 */
export * from "./v1"
export * as v1 from "./v1"
