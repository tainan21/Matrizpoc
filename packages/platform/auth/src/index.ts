/**
 * @matriz/platform-auth
 *
 * Shared auth engine for the Matriz ecosystem. The root barrel is server-safe:
 * it exposes types, schemas, strategies, session storage, services and
 * imperative guards. React hooks/provider/context live under
 * `@matriz/platform-auth/client`.
 *
 * V2 will ship under its own path and apps migrate one at a time (L7).
 */
export * from "./server"
