/**
 * @matriz/platform-auth/v1/server
 *
 * Real server-side auth primitives. Apps import these from Next.js API
 * route handlers. Depends on @matriz/platform-db/core.
 *
 * IMPORTANT: this module is server-only. Do NOT import from client code —
 * it pulls bcryptjs and the Prisma client.
 */
export {
  issueOtpChallenge,
  issueMagicLinkChallenge,
  verifyChallenge,
  purgeStaleChallenges,
  type ChallengeContext,
  type OtpChallengeIssued,
  type MagicLinkChallengeIssued,
  type ChallengeIssued,
  type VerifyChallengeResult,
} from "./challenges"

export { resolveIdentityByEmail } from "./identity"

export {
  issueSession,
  readSessionByToken,
  revokeSessionByToken,
  type IssueSessionInput,
  type IssuedSession,
} from "./sessions"
