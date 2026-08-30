import { createHash } from "node:crypto"
import { hashCredential } from "./credential-authenticator.js"

type SeedDatabase = { authAccount: { upsert(input: unknown): Promise<unknown> } }
type SeedEnvironment = Readonly<Record<string, string | undefined>>

const accounts = [
  { userId: "user-local-owner", email: "owner@matriz.local", passwordKey: "IDENTITY_LOCAL_OWNER_PASSWORD" },
  { userId: "user-local-operator", email: "operator@matriz.local", passwordKey: "IDENTITY_LOCAL_OPERATOR_PASSWORD" },
  { userId: "user-local-denied", email: "sem-acesso@matriz.local", passwordKey: "IDENTITY_LOCAL_DENIED_PASSWORD" },
] as const

export async function seedLocalIdentityCredentials(database: SeedDatabase, environment: SeedEnvironment): Promise<void> {
  if (environment.MATRIZ_RUNTIME_PROFILE !== "local") throw new Error("Identity credential seed requires the explicit local profile")
  for (const account of accounts) {
    const credential = environment[account.passwordKey]
    if (!credential || credential.length < 12) throw new Error(`${account.passwordKey} must contain at least 12 characters`)
    const credentialHash = await hashCredential(credential)
    const providerSubject = createHash("sha256").update(account.email).digest("hex")
    await database.authAccount.upsert({
      where: { provider_providerSubject: { provider: "PASSWORD", providerSubject } },
      update: { userId: account.userId, email: account.email, emailVerifiedAt: new Date(0), credentialHash, metadata: { localSeed: "v1" } },
      create: { userId: account.userId, provider: "PASSWORD", providerSubject, email: account.email, emailVerifiedAt: new Date(0), credentialHash, metadata: { localSeed: "v1" } },
    })
  }
}
