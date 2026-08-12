import { type CorePrismaClient } from "@matriz/platform-db/core";
import type { AccessRepository } from "./authorization.js";
import type { SqlExecutor } from "./neon-adapter.js";
export type OidcClientRegistration = {
    client_id: string;
    redirect_uris: string[];
    post_logout_redirect_uris: string[];
    grant_types: string[];
    response_types: string[];
    token_endpoint_auth_method: string;
};
export declare function createSqlExecutor(client: CorePrismaClient): SqlExecutor;
export declare function createAccessRepository(client?: CorePrismaClient): AccessRepository;
export declare function loadActiveClients(client?: CorePrismaClient): Promise<OidcClientRegistration[]>;
export declare function findAccountClaims(id: string, client?: CorePrismaClient): Promise<{
    accountId: string;
    claims(): Promise<{
        sub: string;
        email: string;
        email_verified: boolean;
        name: string;
        locale: string | null;
        zoneinfo: string | null;
    }>;
} | undefined>;
//# sourceMappingURL=persistence.d.ts.map