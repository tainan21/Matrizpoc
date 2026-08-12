/** Technical runtime guard and lazy singleton shared by schema entrypoints. */
export function getOrCreateSchemaClient({ Client, environmentName, globalKey, }) {
    if (typeof window !== "undefined") {
        throw new Error("Prisma clients are server-only and cannot run in a browser");
    }
    const runtime = globalThis;
    const existing = runtime[globalKey];
    if (existing)
        return existing;
    const url = process.env[environmentName];
    if (!url) {
        throw new Error(`Missing ${environmentName}`);
    }
    const client = new Client({
        datasources: { db: { url } },
        log: prismaLogLevels(),
    });
    runtime[globalKey] = client;
    return client;
}
export function prismaLogLevels() {
    return process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"];
}
//# sourceMappingURL=client-runtime.js.map