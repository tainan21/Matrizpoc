/**
 * Server-safe public surface for @matriz/platform-auth.
 *
 * This module intentionally exports only pure types, schemas, strategies,
 * storage helpers and imperative guards. React context/hooks/provider live in
 * ./client so Server Components never evaluate createContext by accident.
 */
export const PLATFORM_AUTH_VERSION = "1.1.0" as const

export type {
  AuthUser,
  AuthTenantAccess,
  AuthIdentity,
  AuthSession,
  AuthStatus,
  AuthError,
  AuthErrorCode,
  AuthResult,
} from "./v1/types"
export { authError, authOk, authErr } from "./v1/types"

export {
  authUserSchema,
  authTenantAccessSchema,
  authIdentitySchema,
  authSessionSchema,
} from "./v1/schemas"

export type { AuthProviderConfig, SessionSnapshot } from "./v1/contracts"

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
} from "./v1/strategies/strategy.types"

export {
  createOtpStrategy,
  type OtpStrategyOptions,
} from "./v1/strategies/otp.strategy"
export {
  createMagicLinkStrategy,
  type MagicLinkStrategyOptions,
} from "./v1/strategies/magic-link.strategy"

export type { SessionStorage } from "./v1/storage/session.storage"
export {
  createAppSessionStorage,
  createSessionStorageFrom,
} from "./v1/storage/session.storage"

export {
  createSession,
  persistSession,
  clearSession,
  restoreSession,
  refreshSession,
} from "./v1/services/session.service"

export {
  toSessionSnapshot,
  fromSessionSnapshot,
} from "./v1/mappers/session-snapshot.mapper"

export { requireSession } from "./v1/guards/requireSession"

export type {
  AuthMethodId,
  ChallengeMethod,
  MockGoogleAccount,
  AuthChallenge,
  RecentAppAccess,
  SharedAuthSession,
  MockAuthClock,
  MockAuthState,
} from "./v1/mock/mock-auth"
export { MOCK_GOOGLE_ACCOUNTS, createMockAuthState } from "./v1/mock/mock-auth"
export type { MockAuthBroker } from "./v1/mock/mock-auth-broker"
export { createHttpMockAuthBroker } from "./v1/mock/mock-auth-broker"
