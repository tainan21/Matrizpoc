export type DatabaseAvailability =
  | { readonly kind: "ready" }
  | {
      readonly kind: "unavailable"
      readonly missing: readonly ("CORE_DATABASE_URL" | "SEUMEI_DATABASE_URL")[]
    }

export function resolveDatabaseAvailability(
  env: Readonly<Record<string, string | undefined>>,
): DatabaseAvailability {
  const shared = Boolean(env.DATABASE_URL?.trim())
  const missing: ("CORE_DATABASE_URL" | "SEUMEI_DATABASE_URL")[] = []
  if (!shared && !env.CORE_DATABASE_URL?.trim()) missing.push("CORE_DATABASE_URL")
  if (!shared && !env.SEUMEI_DATABASE_URL?.trim()) missing.push("SEUMEI_DATABASE_URL")
  return missing.length > 0 ? { kind: "unavailable", missing } : { kind: "ready" }
}
