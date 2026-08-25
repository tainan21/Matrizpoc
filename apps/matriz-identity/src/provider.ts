import Provider from "oidc-provider"

import { buildProviderConfiguration, type IdentityEnvironment } from "./config.js"
import { createNeonAdapterFactory } from "./neon-adapter.js"
import { createSqlExecutor, findAccountClaims, getIdentityDb, loadActiveClients } from "./persistence.js"

export async function createIdentityProvider(environment: IdentityEnvironment): Promise<Provider> {
  const database = getIdentityDb()
  const clients = await loadActiveClients(database)
  const configuration = {
    ...buildProviderConfiguration(environment),
    adapter: createNeonAdapterFactory(createSqlExecutor(database)),
    clients,
    findAccount: (_context: unknown, id: string) => findAccountClaims(id, database),
  }
  const provider = new Provider(environment.issuer, configuration)
  provider.proxy = environment.trustProxy
  return provider
}
