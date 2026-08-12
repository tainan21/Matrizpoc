import Provider from "oidc-provider";
import { getCoreDb } from "@matriz/platform-db/core";
import { buildProviderConfiguration } from "./config.js";
import { createNeonAdapterFactory } from "./neon-adapter.js";
import { createSqlExecutor, findAccountClaims, loadActiveClients } from "./persistence.js";
export async function createIdentityProvider(environment) {
    const database = getCoreDb();
    const clients = await loadActiveClients(database);
    const configuration = {
        ...buildProviderConfiguration(environment),
        adapter: createNeonAdapterFactory(createSqlExecutor(database)),
        clients,
        findAccount: (_context, id) => findAccountClaims(id, database),
    };
    const provider = new Provider(environment.issuer, configuration);
    provider.proxy = environment.trustProxy;
    return provider;
}
//# sourceMappingURL=provider.js.map