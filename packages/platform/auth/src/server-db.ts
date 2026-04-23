/**
 * @matriz/platform-auth/server-db
 *
 * Real database-backed auth primitives for V1.3. Distinct from ./server
 * which is the pure, stateless layer (schemas, strategies, service helpers).
 *
 * Server-db depends on @matriz/platform-db/core and bcryptjs — NEVER import
 * this from client code.
 */
export {
  issueOtpChallenge,
  issueMagicLinkChallenge,
  verifyChallenge,
  purgeStaleChallenges,
  resolveIdentityByEmail,
  issueSession,
  readSessionByToken,
  revokeSessionByToken,
  type ChallengeContext,
  type OtpChallengeIssued,
  type MagicLinkChallengeIssued,
  type ChallengeIssued,
  type VerifyChallengeResult,
  type IssueSessionInput,
  type IssuedSession,
} from "./v1/server"
