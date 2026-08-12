function required(env, name) {
    const value = env[name]?.trim();
    if (!value)
        throw new Error(`Missing ${name}`);
    return value;
}
export function loadIdentityEnvironment(env) {
    const issuer = required(env, "IDENTITY_ISSUER");
    const databaseUrl = required(env, "CORE_RUNTIME_DATABASE_URL");
    const rawJwks = required(env, "IDENTITY_SIGNING_JWKS");
    const production = env.NODE_ENV === "production";
    const parsedIssuer = new URL(issuer);
    if (production && parsedIssuer.protocol !== "https:") {
        throw new Error("IDENTITY_ISSUER must use https in production");
    }
    let parsed;
    try {
        parsed = JSON.parse(rawJwks);
    }
    catch {
        throw new Error("IDENTITY_SIGNING_JWKS must be valid JSON");
    }
    const keys = Array.isArray(parsed?.keys)
        ? parsed.keys
        : [parsed];
    if (keys.length === 0 || keys.some((key) => !key.kty || !key.kid || !key.d)) {
        throw new Error("IDENTITY_SIGNING_JWKS must contain asymmetric private keys with kid");
    }
    const port = Number(env.PORT ?? "8080");
    if (!Number.isSafeInteger(port) || port < 1 || port > 65535)
        throw new Error("PORT is invalid");
    return { issuer: parsedIssuer.toString().replace(/\/$/, ""), databaseUrl, jwks: { keys }, trustProxy: true, port };
}
export function buildProviderConfiguration(environment) {
    return {
        claims: {
            openid: ["sub"],
            profile: ["name", "locale", "zoneinfo"],
            email: ["email", "email_verified"],
        },
        features: {
            devInteractions: { enabled: false },
            revocation: { enabled: true },
            rpInitiatedLogout: { enabled: true },
        },
        jwks: environment.jwks,
        pkce: { methods: ["S256"], required: () => true },
        rotateRefreshToken: true,
        scopes: ["openid", "profile", "email", "offline_access"],
        ttl: {
            AccessToken: 5 * 60,
            AuthorizationCode: 60,
            IdToken: 5 * 60,
            Interaction: 10 * 60,
            RefreshToken: 7 * 24 * 60 * 60,
        },
    };
}
//# sourceMappingURL=config.js.map