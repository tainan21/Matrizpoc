import { createHash } from "node:crypto"
import type { InfrastructureContractV1 } from "../../packages/integration/infrastructure-contracts/src/index"

export function oidcClientSecretEnvironmentKey(clientId: string): string {
  return `OIDC_CLIENT_SECRET_${clientId.replace(/[^A-Za-z0-9]/g, "_").toUpperCase()}`
}

export function buildLocalOidcClientRegistrations(
  contracts: readonly InfrastructureContractV1[],
  environment: Readonly<Record<string, string | undefined>>,
) {
  return contracts.filter((contract) => contract.identity.required).map((contract) => {
    const clientId = contract.identity.oidcClientId!
    const callbackPath = contract.identity.callbackPath!
    const port = contract.runtime.port
    if (!port) throw new Error(`OIDC app ${contract.appId} has no local runtime port`)
    const secretKey = oidcClientSecretEnvironmentKey(clientId)
    const secret = environment[secretKey]
    if (!secret) throw new Error(`Missing ${secretKey}`)
    if (Buffer.byteLength(secret) < 32) throw new Error(`${secretKey} must contain at least 32 bytes`)
    const origin = `http://127.0.0.1:${port}`
    return {
      appId: contract.appId,
      clientId,
      name: `${contract.appId} local development`,
      redirectUris: [`${origin}${callbackPath}`],
      postLogoutRedirectUris: [`${origin}/`],
      grantTypes: ["authorization_code", "refresh_token"],
      responseTypes: ["code"],
      tokenEndpointAuthMethod: "client_secret_basic",
      secretFingerprint: createHash("sha256").update(secret).digest("hex"),
      enabled: true,
    }
  })
}
