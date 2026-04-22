/**
 * @matriz/platform-auth
 *
 * Shared auth engine for the Matriz ecosystem. Provides types, schemas,
 * strategies (OTP, magic link), session storage, provider, hooks and
 * guards. No app-specific domain (L12). Apps adopt via
 * `apps/<app>/src/auth/*`.
 *
 * The default export IS v1. V2 will ship under `./v2` and apps migrate
 * one at a time (L7).
 */
export const PLATFORM_AUTH_VERSION = "1.1.0" as const

export * from "./v1"
