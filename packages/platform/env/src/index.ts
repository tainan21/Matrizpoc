/**
 * @matriz/platform-env
 *
 * Typed environment access helpers. No real secrets in code; just shape +
 * safe readers. Apps can still reach `process.env` directly where needed,
 * but consuming via these helpers guarantees consistent behavior and typing.
 */
export const PLATFORM_ENV_VERSION = "0.1.0" as const

/** Reads a required env var, throws if missing (use at boot only). */
export function requireEnv(name: string): string {
  const v =
    typeof process !== "undefined" && process.env ? process.env[name] : undefined
  if (!v || v.length === 0) {
    throw new Error(`[matriz/env] Required env var missing: ${name}`)
  }
  return v
}

/** Reads an optional env var, returns `fallback` when unset. */
export function getEnv(name: string, fallback?: string): string | undefined {
  const v =
    typeof process !== "undefined" && process.env ? process.env[name] : undefined
  return v && v.length > 0 ? v : fallback
}

export function isProduction(): boolean {
  return getEnv("NODE_ENV") === "production"
}

export function isDevelopment(): boolean {
  const v = getEnv("NODE_ENV")
  return v === undefined || v === "development"
}
