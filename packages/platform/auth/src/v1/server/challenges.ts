/**
 * Real server-side OTP/Magic Link challenge lifecycle.
 *
 * Replaces the in-memory Map<token, ...> used by the client-side
 * strategies in V1.1. Apps call these functions from API route handlers.
 *
 * Security:
 *  - OTP codes are 6 digits; only bcrypt(code) is stored.
 *  - Magic-link tokens are 256-bit random base64url; only sha256(token) is stored.
 *  - Challenges are single-use via consumedAt.
 *  - Brute-force throttled by `maxAttempts` (5 by default).
 */
import { createHash, randomBytes, randomInt } from "node:crypto"
import bcrypt from "bcryptjs"
import { getCoreDb } from "@matriz/platform-db/core"
import { makeAuthChallengeRepo } from "@matriz/platform-db/core/repositories"
import type { AuthChallengeKind } from "@matriz/platform-db/core"

const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes
const MAGIC_LINK_TTL_MS = 10 * 60 * 1000

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null
  return sha256(ip).slice(0, 32)
}

export type ChallengeContext = {
  readonly ip?: string | null
  readonly userAgent?: string | null
}

export type OtpChallengeIssued = {
  readonly kind: "OTP"
  readonly challengeId: string
  readonly email: string
  readonly expiresAt: Date
  /**
   * The raw 6-digit OTP code. The server sends this via email/SMS; we
   * return it here so the POC can render it inline. In production,
   * NEVER expose this over the wire — ship via a notifications adapter.
   */
  readonly code: string
}

export type MagicLinkChallengeIssued = {
  readonly kind: "MAGIC_LINK"
  readonly challengeId: string
  readonly email: string
  readonly expiresAt: Date
  /** Raw token. Client embeds it into the magic-link URL. */
  readonly token: string
}

export type ChallengeIssued = OtpChallengeIssued | MagicLinkChallengeIssued

/**
 * Issues a new OTP challenge. Returns the raw code so the calling route can
 * dispatch it via email/SMS. The DB only sees a bcrypt hash.
 */
export async function issueOtpChallenge(
  email: string,
  ctx: ChallengeContext = {},
): Promise<OtpChallengeIssued> {
  const repo = makeAuthChallengeRepo(getCoreDb())
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0")
  const codeHash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + OTP_TTL_MS)
  const row = await repo.create({
    kind: "OTP",
    email,
    codeHash,
    expiresAt,
    ipHash: hashIp(ctx.ip),
    userAgent: ctx.userAgent ?? null,
  })
  return { kind: "OTP", challengeId: row.id, email: row.email, expiresAt, code }
}

/**
 * Issues a new magic-link challenge. Returns the raw token; the DB stores
 * only its sha256 hash.
 */
export async function issueMagicLinkChallenge(
  email: string,
  ctx: ChallengeContext = {},
): Promise<MagicLinkChallengeIssued> {
  const repo = makeAuthChallengeRepo(getCoreDb())
  const token = randomBytes(32).toString("base64url")
  const codeHash = sha256(token)
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS)
  const row = await repo.create({
    kind: "MAGIC_LINK",
    email,
    codeHash,
    expiresAt,
    ipHash: hashIp(ctx.ip),
    userAgent: ctx.userAgent ?? null,
  })
  return {
    kind: "MAGIC_LINK",
    challengeId: row.id,
    email: row.email,
    expiresAt,
    token,
  }
}

export type VerifyChallengeResult =
  | { readonly ok: true; readonly challengeId: string; readonly email: string }
  | {
      readonly ok: false
      readonly reason:
        | "not-found"
        | "expired"
        | "already-consumed"
        | "too-many-attempts"
        | "invalid-code"
    }

/**
 * Verifies (and consumes) an OTP or magic-link challenge. On success the
 * challenge is marked consumed; on invalid attempts the counter increments
 * and exceeding `maxAttempts` invalidates further tries.
 */
export async function verifyChallenge(
  kind: AuthChallengeKind,
  email: string,
  rawCode: string,
): Promise<VerifyChallengeResult> {
  const db = getCoreDb()
  const repo = makeAuthChallengeRepo(db)
  const challenge = await repo.findLiveByEmail(kind, email)
  if (!challenge) return { ok: false, reason: "not-found" }
  if (challenge.consumedAt) return { ok: false, reason: "already-consumed" }
  if (challenge.expiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: "expired" }
  }
  if (challenge.attempts >= challenge.maxAttempts) {
    return { ok: false, reason: "too-many-attempts" }
  }

  const isMatch =
    kind === "OTP"
      ? await bcrypt.compare(rawCode, challenge.codeHash)
      : sha256(rawCode) === challenge.codeHash

  if (!isMatch) {
    await repo.incrementAttempts(challenge.id)
    return { ok: false, reason: "invalid-code" }
  }

  await repo.consume(challenge.id)
  return { ok: true, challengeId: challenge.id, email: challenge.email }
}

/** Periodic cleanup — call from a scheduled job. */
export async function purgeStaleChallenges() {
  const repo = makeAuthChallengeRepo(getCoreDb())
  return repo.purgeStale()
}
