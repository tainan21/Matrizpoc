export const LOCAL_SEED_DATABASE_KEYS = [
  "CORE_DATABASE_URL",
  "HUB_DATABASE_URL",
  "SPOT_DATABASE_URL",
  "SEUMEI_DATABASE_URL",
  "CONTRACTS_DATABASE_URL",
  "WILLDASH_DATABASE_URL",
  "OPS_DATABASE_URL",
  "PAY_DATABASE_URL",
] as const

export function assertLocalSeedEnvironment(environment: Readonly<Record<string, string | undefined>>): readonly URL[] {
  if (environment.MATRIZ_ENVIRONMENT !== "local") throw new Error("Development seed requires the explicit local profile")
  return LOCAL_SEED_DATABASE_KEYS.map((key) => {
    const value = environment[key]
    if (!value) throw new Error(`${key} is required for the local development seed`)
    let url: URL
    try { url = new URL(value) } catch { throw new Error(`${key} must target the managed local database`) }
    if ((url.protocol !== "postgresql:" && url.protocol !== "postgres:")
      || url.hostname !== "127.0.0.1"
      || url.port !== "55432"
      || url.pathname !== "/matriz") {
      throw new Error(`${key} must target the managed local database at 127.0.0.1:55432/matriz`)
    }
    return url
  })
}
