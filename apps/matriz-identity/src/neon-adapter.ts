export interface SqlExecutor {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: T[] }>
}

const ALLOWED_MODELS = new Set([
  "AccessToken", "AuthorizationCode", "BackchannelAuthenticationRequest", "ClientCredentials",
  "DeviceCode", "Grant", "InitialAccessToken", "Interaction", "RefreshToken", "RegistrationAccessToken",
  "ReplayDetection", "Session",
])

type OidcPayload = Record<string, unknown>

export function createNeonAdapterFactory(sql: SqlExecutor) {
  return class NeonOidcAdapter {
    readonly #model: string

    constructor(model: string) {
      if (!ALLOWED_MODELS.has(model)) throw new Error(`Unsupported oidc-provider model: ${model}`)
      this.#model = model
    }

    async upsert(id: string, payload: OidcPayload, expiresIn: number): Promise<void> {
      await sql.query(
        `INSERT INTO core.oidc_artifacts ("model", "id", "payload", "grantId", "userCode", "uid", "expiresAt")
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, now() + ($7 * interval '1 second'))
         ON CONFLICT ("model", "id") DO UPDATE SET "payload" = EXCLUDED."payload", "grantId" = EXCLUDED."grantId",
           "userCode" = EXCLUDED."userCode", "uid" = EXCLUDED."uid", "expiresAt" = EXCLUDED."expiresAt", "consumedAt" = NULL`,
        [this.#model, id, JSON.stringify(payload), payload.grantId ?? null, payload.userCode ?? null, payload.uid ?? null, expiresIn],
      )
    }

    async find(id: string): Promise<OidcPayload | undefined> {
      const result = await sql.query<{ payload: OidcPayload; consumedAt?: Date }>(
        `SELECT "payload", "consumedAt" FROM core.oidc_artifacts
         WHERE "model" = $1 AND "id" = $2 AND "expiresAt" > now()`,
        [this.#model, id],
      )
      const row = result.rows[0]
      if (!row) return undefined
      return row.consumedAt ? { ...row.payload, consumed: Math.floor(row.consumedAt.getTime() / 1000) } : row.payload
    }

    async findByUserCode(userCode: string): Promise<OidcPayload | undefined> {
      return this.#findBy("user_code", userCode)
    }

    async findByUid(uid: string): Promise<OidcPayload | undefined> {
      return this.#findBy("uid", uid)
    }

    async #findBy(column: "user_code" | "uid", value: string): Promise<OidcPayload | undefined> {
      const result = await sql.query<{ payload: OidcPayload }>(
        `SELECT "payload" FROM core.oidc_artifacts WHERE "model" = $1 AND "${column === "user_code" ? "userCode" : "uid"}" = $2 AND "expiresAt" > now()`,
        [this.#model, value],
      )
      return result.rows[0]?.payload
    }

    async consume(id: string): Promise<void> {
      await sql.query('UPDATE core.oidc_artifacts SET "consumedAt" = now() WHERE "model" = $1 AND "id" = $2', [this.#model, id])
    }

    async destroy(id: string): Promise<void> {
      await sql.query('DELETE FROM core.oidc_artifacts WHERE "model" = $1 AND "id" = $2', [this.#model, id])
    }

    async revokeByGrantId(grantId: string): Promise<void> {
      await sql.query('DELETE FROM core.oidc_artifacts WHERE "grantId" = $1', [grantId])
    }
  }
}
