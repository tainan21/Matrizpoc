/**
 * AuthVerificationChallenge Repository — persistent OTP/magic-link challenges.
 *
 * Replaces the in-memory Map<token, ...> used by V1.1 strategies. This is the
 * backing store that makes auth real cross-process and cross-app.
 *
 * Security:
 *  - codeHash is bcrypt(otp) or sha256(magic-link-token). Never plain text.
 *  - Challenges are single-use via `consumedAt`.
 *  - Attempt counter prevents brute force; exceeding `maxAttempts` invalidates.
 */
import type { AuthChallengeKind, CorePrismaClient } from "../../core"
import { normalizeEmail } from "./users.repo"

export function makeAuthChallengeRepo(db: CorePrismaClient) {
  return {
    create: (input: {
      kind: AuthChallengeKind
      email: string
      codeHash: string
      expiresAt: Date
      maxAttempts?: number
      ipHash?: string | null
      userAgent?: string | null
    }) =>
      db.authVerificationChallenge.create({
        data: {
          kind: input.kind,
          email: normalizeEmail(input.email),
          codeHash: input.codeHash,
          expiresAt: input.expiresAt,
          maxAttempts: input.maxAttempts ?? 5,
          ipHash: input.ipHash ?? null,
          userAgent: input.userAgent ?? null,
        },
      }),

    /** Returns the most recent live challenge for (email, kind). */
    findLiveByEmail: (kind: AuthChallengeKind, email: string) =>
      db.authVerificationChallenge.findFirst({
        where: {
          kind,
          email: normalizeEmail(email),
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      }),

    incrementAttempts: (id: string) =>
      db.authVerificationChallenge.update({
        where: { id },
        data: { attempts: { increment: 1 } },
      }),

    consume: (id: string) =>
      db.authVerificationChallenge.update({
        where: { id },
        data: { consumedAt: new Date() },
      }),

    /** Clean up expired/consumed rows — invoked by a light periodic job. */
    purgeStale: (cutoff = new Date()) =>
      db.authVerificationChallenge.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: cutoff } }, { consumedAt: { not: null } }],
        },
      }),
  }
}

export type AuthChallengeRepo = ReturnType<typeof makeAuthChallengeRepo>
