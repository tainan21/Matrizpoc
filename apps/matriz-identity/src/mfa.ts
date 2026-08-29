import { createCipheriv, createDecipheriv, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto"

export type MfaMethod =
  | Readonly<{ kind: "totp"; secretCiphertext: string; algorithm: "SHA1"; digits: 6; periodSeconds: 30 }>
  | Readonly<{ kind: "passkey"; credentialId: string; publicKey: string; signCount: number; transports: readonly string[] }>

export function encryptTotpSecret(secret: string, encodedKey: string): string {
  const key = encryptionKey(encodedKey)
  const nonce = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, nonce)
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()])
  return `aes-256-gcm-v1$${nonce.toString("base64url")}$${cipher.getAuthTag().toString("base64url")}$${ciphertext.toString("base64url")}`
}

export function decryptTotpSecret(encoded: string, encodedKey: string): string {
  const [version, nonce, tag, ciphertext] = encoded.split("$")
  if (version !== "aes-256-gcm-v1" || !nonce || !tag || !ciphertext) throw new Error("Invalid encrypted TOTP secret")
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(encodedKey), Buffer.from(nonce, "base64url"))
  decipher.setAuthTag(Buffer.from(tag, "base64url"))
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8")
}

function encryptionKey(encoded: string): Buffer {
  const key = Buffer.from(encoded, "base64url")
  if (key.length !== 32) throw new Error("IDENTITY_MFA_ENCRYPTION_KEY must encode exactly 32 bytes")
  return key
}

export function createTotpEnrollment(accountName: string, secret = toBase32(randomBytes(20))) {
  const method = { kind: "totp", secretCiphertext: secret, algorithm: "SHA1", digits: 6, periodSeconds: 30 } as const
  const label = encodeURIComponent(`Matriz:${accountName}`)
  return { method, otpauthUri: `otpauth://totp/${label}?secret=${secret}&issuer=Matriz&algorithm=SHA1&digits=6&period=30` }
}

export function verifyTotp(code: string, secret: string, now = new Date(), window = 1): boolean {
  if (!/^\d{6}$/.test(code) || window < 0 || window > 1) return false
  const counter = Math.floor(now.getTime() / 30_000)
  for (let offset = -window; offset <= window; offset += 1) if (totp(secret, counter + offset) === code) return true
  return false
}

export async function verifyAndConsumeTotp(repository: { advanceCounter(methodId: string, counter: number): Promise<boolean> }, input: { methodId: string; secret: string; code: string; now?: Date }): Promise<boolean> {
  const counter = Math.floor((input.now ?? new Date()).getTime() / 30_000)
  return totp(input.secret, counter) === input.code && repository.advanceCounter(input.methodId, counter)
}

export function requiresStepUp(input: { required: boolean; amr: readonly string[]; authTime: number; acr?: string }, nowSeconds: number, maxAgeSeconds = 900): boolean {
  return input.required && (input.acr !== "urn:matriz:loa:2" || !input.amr.some((method) => method === "otp" || method === "hwk") || input.authTime > nowSeconds + 60 || nowSeconds - input.authTime > maxAgeSeconds)
}

export interface RecoveryCodeRepository {
  findActive(userId: string): Promise<readonly { id: string; codeHash: string }[]>
  consume(id: string, consumedAt: Date): Promise<boolean>
  audit(event: { actorUserId: string; eventType: "MFA_RECOVERY_USED"; subjectId: string }): Promise<void>
}

export async function hashRecoveryCode(code: string, salt = randomBytes(16)): Promise<string> {
  const hash = await scrypt(code, salt)
  return `scrypt-v1$${salt.toString("base64url")}$${hash.toString("base64url")}`
}
export async function verifyRecoveryCode(code: string, encoded: string): Promise<boolean> {
  try { const [version, salt, expected] = encoded.split("$"); if (version !== "scrypt-v1" || !salt || !expected) return false; const wanted = Buffer.from(expected, "base64url"); const actual = await scrypt(code, Buffer.from(salt, "base64url")); return wanted.length === actual.length && timingSafeEqual(wanted, actual) } catch { return false }
}
export async function consumeRecoveryCode(repository: RecoveryCodeRepository, input: { userId: string; code: string }): Promise<boolean> {
  const candidates = await repository.findActive(input.userId)
  let candidate: { id: string; codeHash: string } | undefined
  for (const current of candidates) if (await verifyRecoveryCode(input.code, current.codeHash)) { candidate = current; break }
  if (!candidate) return false
  if (!await repository.consume(candidate.id, new Date())) return false
  await repository.audit({ actorUserId: input.userId, eventType: "MFA_RECOVERY_USED", subjectId: candidate.id })
  return true
}
function scrypt(value: string, salt: Buffer): Promise<Buffer> { return new Promise((resolve, reject) => scryptCallback(value, salt, 32, { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key))) }
function totp(secret: string, counter: number): string { const value = Buffer.alloc(8); value.writeBigUInt64BE(BigInt(counter)); const digest = createHmac("sha1", fromBase32(secret)).update(value).digest(); const offset = digest[digest.length - 1]! & 15; const number = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000; return String(number).padStart(6, "0") }
function fromBase32(value: string): Buffer { const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let bits = ""; for (const char of value.toUpperCase().replace(/=+$/, "")) { const index = alphabet.indexOf(char); if (index < 0) throw new Error("Invalid base32"); bits += index.toString(2).padStart(5, "0") } const bytes: number[] = []; for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2)); return Buffer.from(bytes) }
function toBase32(value: Buffer): string { const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let bits = ""; for (const byte of value) bits += byte.toString(2).padStart(8, "0"); let output = ""; for (let index = 0; index < bits.length; index += 5) output += alphabet[Number.parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)]; return output }
