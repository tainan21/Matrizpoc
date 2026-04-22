/**
 * High-level contracts exposed to apps. These are the shapes an app wires
 * up in `apps/<app>/src/auth/` to compose the provider.
 */
import type { AppId } from "@matriz/foundation-types"
import type { SignInStrategy } from "./strategies/strategy.types"
import type { SessionStorage } from "./storage/session.storage"

/**
 * Immutable snapshot persisted by `SessionStorage`. Versioned (`v`) so
 * apps can detect and discard outdated session shapes on upgrade.
 */
export interface SessionSnapshot {
  readonly v: 1
  readonly activeTenantId: string
  readonly strategyId: string
  readonly issuedAt: string
  readonly expiresAt: string
  readonly identity: {
    readonly user: {
      readonly id: string
      readonly name: string
      readonly email: string
    }
    readonly tenants: ReadonlyArray<{
      readonly tenantId: string
      readonly tenantName: string
      readonly roles: readonly string[]
      readonly enabledApps: readonly string[]
    }>
  }
}

/**
 * Everything an app passes to `<AuthProvider>`. All fields are pure data
 * or pure functions — no hidden globals. This is the surface to test
 * against when extracting an app to its own repository (L3).
 */
export interface AuthProviderConfig {
  /** Owning app. Used for storage namespacing and strategy keying. */
  readonly appId: AppId
  /**
   * Strategies available in this app. The first one is the default picked
   * when no explicit strategy is requested on sign-in.
   */
  readonly strategies: readonly SignInStrategy[]
  /**
   * Persistence surface. Defaults to the local-storage backed
   * implementation when omitted (see `storage/session.storage`).
   */
  readonly storage?: SessionStorage
  /**
   * Optional override for the current time. Injected for deterministic
   * tests of expiry/refresh logic.
   */
  readonly now?: () => Date
  /**
   * Session lifetime in ms. Defaults to 24h.
   */
  readonly sessionTtlMs?: number
}
