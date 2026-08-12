export type AuthorizationContext = Readonly<{
    userId: string;
    tenantId: string;
    appId: string;
    membershipId: string;
    tenantRoles: readonly string[];
    appRoles: readonly string[];
    capabilities: readonly string[];
    sessionId: string;
    traceId: string;
}>;
export type ActiveAccess = Omit<AuthorizationContext, "sessionId" | "traceId">;
export interface AccessRepository {
    findAccess(input: {
        userId: string;
        tenantId: string;
        appId: string;
    }): Promise<ActiveAccess | null>;
}
export declare function resolveAuthorizationContext(repository: AccessRepository, identity: {
    userId: string;
    tenantId: string;
    appId: string;
    sessionId: string;
}, traceId: string): Promise<AuthorizationContext>;
//# sourceMappingURL=authorization.d.ts.map