import { createHash } from "node:crypto"
import { hashCredential } from "./credential-authenticator.js"
import { encryptTotpSecret } from "./mfa.js"

type SeedDatabase = {
  authAccount: { upsert(input: unknown): Promise<unknown> }
  identityMfaMethod: { upsert(input: unknown): Promise<unknown> }
}
type SeedEnvironment = Readonly<Record<string, string | undefined>>

const accounts = [
  { userId: "user-local-owner", email: "owner@matriz.local", passwordKey: "IDENTITY_LOCAL_OWNER_PASSWORD" },
  { userId: "user-local-operator", email: "operator@matriz.local", passwordKey: "IDENTITY_LOCAL_OPERATOR_PASSWORD" },
  { userId: "user-local-denied", email: "sem-acesso@matriz.local", passwordKey: "IDENTITY_LOCAL_DENIED_PASSWORD" },
] as const

const mfaAccounts = [
  { userId: "user-local-owner", id: "mfa-local-owner-totp", label: "Owner local", secretKey: "IDENTITY_LOCAL_OWNER_TOTP_SECRET" },
  { userId: "user-local-operator", id: "mfa-local-operator-totp", label: "Operador local", secretKey: "IDENTITY_LOCAL_OPERATOR_TOTP_SECRET" },
] as const

export async function seedLocalIdentityCredentials(database: SeedDatabase, environment: SeedEnvironment): Promise<void> {
  if (environment.MATRIZ_RUNTIME_PROFILE !== "local") throw new Error("Identity credential seed requires the explicit local profile")
  const credentials = new Map<string, string>()
  for (const account of accounts) {
    const credential = environment[account.passwordKey]
    if (!credential || credential.length < 12) throw new Error(`${account.passwordKey} must contain at least 12 characters`)
    credentials.set(account.passwordKey, credential)
  }
  const encryptionKey = environment.IDENTITY_MFA_ENCRYPTION_KEY
  if (!encryptionKey) throw new Error("IDENTITY_MFA_ENCRYPTION_KEY is required for the local Identity seed")
  const mfaSecrets = new Map<string, string>()
  for (const account of mfaAccounts) {
    const secret = environment[account.secretKey]
    if (!secret || !/^[A-Z2-7]{32}$/.test(secret)) throw new Error(`${account.secretKey} must contain a 160-bit base32 TOTP secret`)
    mfaSecrets.set(account.secretKey, secret)
  }
  for (const account of accounts) {
    const credential = credentials.get(account.passwordKey)!
    const credentialHash = await hashCredential(credential)
    const providerSubject = createHash("sha256").update(account.email).digest("hex")
    await database.authAccount.upsert({
      where: { provider_providerSubject: { provider: "PASSWORD", providerSubject } },
      update: { userId: account.userId, email: account.email, emailVerifiedAt: new Date(0), credentialHash, metadata: { localSeed: "v1" } },
      create: { userId: account.userId, provider: "PASSWORD", providerSubject, email: account.email, emailVerifiedAt: new Date(0), credentialHash, metadata: { localSeed: "v1" } },
    })
  }
  for (const account of mfaAccounts) {
    const secretCiphertext = encryptTotpSecret(mfaSecrets.get(account.secretKey)!, encryptionKey)
    await database.identityMfaMethod.upsert({
      where: { id: account.id },
      update: { userId: account.userId, kind: "totp", label: account.label, secretCiphertext, verifiedAt: new Date(0), revokedAt: null, lastTotpCounter: null, transports: [] },
      create: { id: account.id, userId: account.userId, kind: "totp", label: account.label, secretCiphertext, verifiedAt: new Date(0), transports: [] },
    })
  }
}
