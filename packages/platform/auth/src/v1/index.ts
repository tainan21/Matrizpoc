/**
 * `@matriz/platform-auth/v1` — versioned public surface (L7).
 *
 * Apps should import from here (or from the root barrel, which re-exports
 * v1 as default). A future `v2/` may co-exist without breaking v1
 * consumers.
 */
export type {
  AuthUser,
  AuthTenantAccess,
  AuthIdentity,
  AuthSession,
  AuthStatus,
  AuthError,
  AuthErrorCode,
  AuthResult,
} from "./types"
export { authError, authOk, authErr } from "./types"

export {
  authUserSchema,
  authTenantAccessSchema,
  authIdentitySchema,
  authSessionSchema,
} from "./schemas"

export type { AuthProviderConfig, SessionSnapshot } from "./contracts"

export type {
  SignInStrategy,
  StrategyId,
  OtpStrategy,
  OtpStartInput,
  OtpStartOutput,
  OtpVerifyInput,
  MagicLinkStrategy,
  MagicLinkStartInput,
  MagicLinkStartOutput,
  MagicLinkVerifyInput,
} from "./strategies/strategy.types"

export {
  createOtpStrategy,
  type OtpStrategyOptions,
} from "./strategies/otp.strategy"
export {
  createMagicLinkStrategy,
  type MagicLinkStrategyOptions,
} from "./strategies/magic-link.strategy"

export type { SessionStorage } from "./storage/session.storage"
export {
  createAppSessionStorage,
  createSessionStorageFrom,
} from "./storage/session.storage"

export {
  createSession,
  persistSession,
  clearSession,
  restoreSession,
  refreshSession,
} from "./services/session.service"

export {
  toSessionSnapshot,
  fromSessionSnapshot,
} from "./mappers/session-snapshot.mapper"

export { AuthProvider, type AuthProviderProps } from "./provider/AuthProvider"
export { AuthContext, type AuthContextValue } from "./provider/auth.context"

export { useAuth } from "./hooks/useAuth"
export { useSession } from "./hooks/useSession"
export { useAuthStatus } from "./hooks/useAuthStatus"

export { AuthGate, type AuthGateProps } from "./guards/AuthGate"
export { requireSession } from "./guards/requireSession"
