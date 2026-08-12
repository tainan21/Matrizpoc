import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto"
import type { IdentityAuthenticator } from "./interactions.js"
import { getIdentityDb, type CorePrismaClient } from "./persistence.js"

const VERSION = "scrypt-v1"
const N = 32768
const R = 8
const P = 1
const KEY_LENGTH = 32
const MAX_CONCURRENT_SCRYPT = 4
let activeScrypt = 0
const waiters: Array<() => void> = []

function derive(credential: string, salt: Buffer, length: number): Promise<Buffer> {
  return withScryptPermit(() => new Promise((resolve, reject) => scryptCallback(credential, salt, length, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key))))
}

async function withScryptPermit<T>(work: () => Promise<T>): Promise<T> {
  if (activeScrypt >= MAX_CONCURRENT_SCRYPT) await new Promise<void>((resolve) => waiters.push(resolve))
  activeScrypt += 1
  try { return await work() } finally { activeScrypt -= 1; waiters.shift()?.() }
}

export async function hashCredential(credential: string, salt = randomBytes(16)): Promise<string> {
  if (credential.length < 12 || credential.length > 1024) throw new Error("Credential length is invalid")
  const derived = await derive(credential, salt, KEY_LENGTH)
  return [VERSION, N, R, P, salt.toString("base64url"), derived.toString("base64url")].join("$")
}

export async function verifyCredential(credential: string, encoded: string): Promise<boolean> {
  try {
    const [version, n, r, p, salt, expected] = encoded.split("$")
    if (version !== VERSION || Number(n) !== N || Number(r) !== R || Number(p) !== P || !salt || !expected) return false
    const expectedBytes = Buffer.from(expected, "base64url")
    const actual = await derive(credential, Buffer.from(salt, "base64url"), expectedBytes.length)
    return actual.length === expectedBytes.length && timingSafeEqual(actual, expectedBytes)
  } catch { return false }
}

export function createCredentialAuthenticator(database: CorePrismaClient = getIdentityDb()): IdentityAuthenticator {
  const dummyHash = hashCredential("dummy credential that is never accepted", Buffer.alloc(16, 0))
  return {
    async authenticate({ login, credential }) {
      if (!login || !credential) return null
      const account = await database.authAccount.findFirst({
        where: { email: login.trim().toLowerCase(), provider: "PASSWORD", credentialHash: { not: null }, emailVerifiedAt: { not: null } },
        select: { userId: true, credentialHash: true },
      })
      const valid = await verifyCredential(credential, account?.credentialHash ?? await dummyHash)
      if (!account?.credentialHash || !valid) return null
      return { accountId: account.userId }
    },
  }
}

export const authenticator: IdentityAuthenticator = {
  authenticate(input) { return createCredentialAuthenticator().authenticate(input) },
}
