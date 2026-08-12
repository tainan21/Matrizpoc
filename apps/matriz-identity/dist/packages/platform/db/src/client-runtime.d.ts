type PrismaLogLevel = "warn" | "error";
export type PrismaClientConstructor<TClient> = new (options: {
    datasources: {
        db: {
            url: string;
        };
    };
    log: PrismaLogLevel[];
}) => TClient;
export type SchemaClientOptions<TClient> = {
    Client: PrismaClientConstructor<TClient>;
    environmentName: string;
    globalKey: string;
};
/** Technical runtime guard and lazy singleton shared by schema entrypoints. */
export declare function getOrCreateSchemaClient<TClient>({ Client, environmentName, globalKey, }: SchemaClientOptions<TClient>): TClient;
export declare function prismaLogLevels(): Array<"warn" | "error">;
export {};
//# sourceMappingURL=client-runtime.d.ts.map