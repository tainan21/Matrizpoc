import { loadIdentityEnvironment } from "../config.js"
import { createIdentityProvider } from "../provider.js"

export async function bootstrapIdentity() {
  const environment = loadIdentityEnvironment(process.env)
  const provider = await createIdentityProvider(environment)
  return { appId: "matriz-identity" as const, environment, provider }
}
