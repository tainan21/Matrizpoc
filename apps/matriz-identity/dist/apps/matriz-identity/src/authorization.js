export async function resolveAuthorizationContext(repository, identity, traceId) {
    const access = await repository.findAccess({
        userId: identity.userId,
        tenantId: identity.tenantId,
        appId: identity.appId,
    });
    if (!access)
        throw new Error("Access denied: active tenant membership and app grant required");
    return Object.freeze({
        ...access,
        tenantRoles: Object.freeze([...access.tenantRoles]),
        appRoles: Object.freeze([...access.appRoles]),
        capabilities: Object.freeze([...access.capabilities]),
        sessionId: identity.sessionId,
        traceId,
    });
}
//# sourceMappingURL=authorization.js.map