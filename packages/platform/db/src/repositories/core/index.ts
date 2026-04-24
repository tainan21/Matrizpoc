/**
 * @matriz/platform-db/core/repositories
 *
 * Public barrel for all Core-schema repositories. Apps import factories from
 * here and pass the Core Prisma client obtained via getCoreDb().
 */
export { makeUserRepo, normalizeEmail, type UserRepo } from "./users.repo"
export { makeAuthAccountRepo, type AuthAccountRepo } from "./auth-accounts.repo"
export { makeAuthChallengeRepo, type AuthChallengeRepo } from "./auth-challenges.repo"
export { makeAppSessionRepo, hashToken, type AppSessionRepo } from "./app-sessions.repo"
export { makeMembershipRepo, type MembershipRepo } from "./memberships.repo"
export { makeTelemetryRepo, type TelemetryRepo } from "./telemetry.repo"
export {
  makeExternalLinkRepo,
  type ExternalLinkInput,
  type ExternalLinkRepo,
} from "./external-links.repo"
