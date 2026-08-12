export interface SqlExecutor {
    query<T extends Record<string, unknown> = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<{
        rows: T[];
    }>;
}
type OidcPayload = Record<string, unknown>;
export declare function createNeonAdapterFactory(sql: SqlExecutor): {
    new (model: string): {
        readonly "__#1@#model": string;
        upsert(id: string, payload: OidcPayload, expiresIn: number): Promise<void>;
        find(id: string): Promise<OidcPayload | undefined>;
        findByUserCode(userCode: string): Promise<OidcPayload | undefined>;
        findByUid(uid: string): Promise<OidcPayload | undefined>;
        "__#1@#findBy"(column: "user_code" | "uid", value: string): Promise<OidcPayload | undefined>;
        consume(id: string): Promise<void>;
        destroy(id: string): Promise<void>;
        revokeByGrantId(grantId: string): Promise<void>;
    };
};
export {};
//# sourceMappingURL=neon-adapter.d.ts.map