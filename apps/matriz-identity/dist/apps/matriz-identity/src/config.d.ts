export type IdentityEnvironment = {
    issuer: string;
    databaseUrl: string;
    jwks: {
        keys: JsonWebKey[];
    };
    trustProxy: boolean;
    port: number;
};
type ProviderConfiguration = {
    adapter?: unknown;
    clients?: readonly Record<string, unknown>[];
    claims: Record<string, readonly string[]>;
    features: Record<string, {
        enabled: boolean;
    }>;
    findAccount?: unknown;
    jwks: {
        keys: JsonWebKey[];
    };
    pkce: {
        methods: readonly ["S256"];
        required: () => boolean;
    };
    rotateRefreshToken: boolean;
    scopes: readonly string[];
    ttl: {
        AccessToken: number;
        AuthorizationCode: number;
        IdToken: number;
        Interaction: number;
        RefreshToken: number;
    };
};
export declare function loadIdentityEnvironment(env: NodeJS.ProcessEnv): IdentityEnvironment;
export declare function buildProviderConfiguration(environment: IdentityEnvironment): ProviderConfiguration;
export {};
//# sourceMappingURL=config.d.ts.map