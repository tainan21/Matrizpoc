import { getCoreDb } from "@matriz/platform-db/core";
export function createSqlExecutor(client) {
    return {
        query: async (text, values = []) => {
            const rows = await client.$queryRawUnsafe(text, ...values);
            return { rows };
        },
    };
}
export function createAccessRepository(client = getCoreDb()) {
    return {
        async findAccess(input) {
            const membership = await client.tenantMembership.findFirst({
                where: { tenantId: input.tenantId, userId: input.userId, revokedAt: null },
                include: { appGrants: { where: { appId: input.appId, revokedAt: null }, take: 1 } },
            });
            const grant = membership?.appGrants[0];
            if (!membership || !grant)
                return null;
            return {
                userId: input.userId,
                tenantId: input.tenantId,
                membershipId: membership.id,
                tenantRoles: membership.tenantRoles,
                appId: input.appId,
                appRoles: grant.appRoles,
                capabilities: grant.capabilities,
            };
        },
    };
}
export async function loadActiveClients(client = getCoreDb()) {
    const registrations = await client.oidcClient.findMany({ where: { enabled: true, revokedAt: null } });
    return registrations.map((registration) => ({
        client_id: registration.clientId,
        redirect_uris: registration.redirectUris.map(assertExactRedirectUri),
        post_logout_redirect_uris: registration.postLogoutRedirectUris.map(assertExactRedirectUri),
        grant_types: registration.grantTypes.filter((type) => type === "authorization_code" || type === "refresh_token"),
        response_types: registration.responseTypes.filter((type) => type === "code"),
        token_endpoint_auth_method: registration.tokenEndpointAuthMethod,
    }));
}
function assertExactRedirectUri(uri) {
    const parsed = new URL(uri);
    if (parsed.hash || uri.includes("*"))
        throw new Error("OIDC redirect URIs must be exact and cannot contain fragments");
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
        throw new Error("OIDC redirect URIs must use https outside local development");
    }
    return parsed.toString();
}
export async function findAccountClaims(id, client = getCoreDb()) {
    const user = await client.user.findUnique({ where: { id } });
    if (!user)
        return undefined;
    return {
        accountId: user.id,
        async claims() {
            return { sub: user.id, email: user.email, email_verified: true, name: user.displayName, locale: user.locale, zoneinfo: user.timezone };
        },
    };
}
//# sourceMappingURL=persistence.js.map