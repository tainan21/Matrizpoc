"use client"

/**
 * Client-only React surface for @matriz/platform-auth.
 *
 * Apps must import hooks, provider, context and declarative guards from this
 * entrypoint. Keeping it explicit prevents Server Components from evaluating
 * React.createContext during module loading.
 */
export type * from "./server"

export { AuthProvider, type AuthProviderProps } from "./v1/provider/AuthProvider"
export { AuthContext, type AuthContextValue } from "./v1/provider/auth.context"

export { useAuth } from "./v1/hooks/useAuth"
export { useSession } from "./v1/hooks/useSession"
export { useAuthStatus } from "./v1/hooks/useAuthStatus"

export { AuthGate, type AuthGateProps } from "./v1/guards/AuthGate"
