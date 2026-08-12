const ALLOWED_MODELS = new Set([
    "AccessToken", "AuthorizationCode", "BackchannelAuthenticationRequest", "ClientCredentials",
    "DeviceCode", "Grant", "InitialAccessToken", "Interaction", "RefreshToken", "RegistrationAccessToken",
    "ReplayDetection", "Session",
]);
export function createNeonAdapterFactory(sql) {
    return class NeonOidcAdapter {
        #model;
        constructor(model) {
            if (!ALLOWED_MODELS.has(model))
                throw new Error(`Unsupported oidc-provider model: ${model}`);
            this.#model = model;
        }
        async upsert(id, payload, expiresIn) {
            await sql.query(`INSERT INTO core.oidc_artifacts (model, id, payload, grant_id, user_code, uid, expires_at)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, now() + ($7 * interval '1 second'))
         ON CONFLICT (model, id) DO UPDATE SET payload = EXCLUDED.payload, grant_id = EXCLUDED.grant_id,
           user_code = EXCLUDED.user_code, uid = EXCLUDED.uid, expires_at = EXCLUDED.expires_at, consumed_at = NULL`, [this.#model, id, JSON.stringify(payload), payload.grantId ?? null, payload.userCode ?? null, payload.uid ?? null, expiresIn]);
        }
        async find(id) {
            const result = await sql.query(`SELECT payload, consumed_at FROM core.oidc_artifacts
         WHERE model = $1 AND id = $2 AND expires_at > now()`, [this.#model, id]);
            const row = result.rows[0];
            if (!row)
                return undefined;
            return row.consumed_at ? { ...row.payload, consumed: Math.floor(row.consumed_at.getTime() / 1000) } : row.payload;
        }
        async findByUserCode(userCode) {
            return this.#findBy("user_code", userCode);
        }
        async findByUid(uid) {
            return this.#findBy("uid", uid);
        }
        async #findBy(column, value) {
            const result = await sql.query(`SELECT payload FROM core.oidc_artifacts WHERE model = $1 AND ${column} = $2 AND expires_at > now()`, [this.#model, value]);
            return result.rows[0]?.payload;
        }
        async consume(id) {
            await sql.query("UPDATE core.oidc_artifacts SET consumed_at = now() WHERE model = $1 AND id = $2", [this.#model, id]);
        }
        async destroy(id) {
            await sql.query("DELETE FROM core.oidc_artifacts WHERE model = $1 AND id = $2", [this.#model, id]);
        }
        async revokeByGrantId(grantId) {
            await sql.query("DELETE FROM core.oidc_artifacts WHERE grant_id = $1", [grantId]);
        }
    };
}
//# sourceMappingURL=neon-adapter.js.map