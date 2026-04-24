/**
 * AuthAccount Repository — links User ↔ auth provider identity.
 *
 * Identity linking policy (V1.3): automatic by normalized email.
 * If a user with same email already exists, any new auth account for a
 * different provider attaches to the same User row.
 */
import type { AuthProvider, CorePrismaClient } from "../../core"
import { normalizeEmail } from "./users.repo"

export function makeAuthAccountRepo(db: CorePrismaClient) {
  return {
    findByProviderSubject: (provider: AuthProvider, providerSubject: string) =>
      db.authAccount.findUnique({
        where: { provider_providerSubject: { provider, providerSubject } },
      }),

    /**
     * Link (or upsert) an auth account to a user. Called after successful
     * challenge verification. `providerSubject` uniquely identifies the
     * identity inside the provider — for OTP/Magic Link we use the
     * normalized email.
     */
    linkToUser: async (input: {
      userId: string
      provider: AuthProvider
      providerSubject: string
      email?: string | null
      emailVerifiedAt?: Date | null
      metadata?: Record<string, unknown> | null
    }) => {
      return db.authAccount.upsert({
        where: {
          provider_providerSubject: {
            provider: input.provider,
            providerSubject: input.providerSubject,
          },
        },
        create: {
          userId: input.userId,
          provider: input.provider,
          providerSubject: input.providerSubject,
          email: input.email ? normalizeEmail(input.email) : null,
          emailVerifiedAt: input.emailVerifiedAt ?? null,
          metadata: (input.metadata ?? null) as never,
        },
        update: {
          userId: input.userId,
          email: input.email ? normalizeEmail(input.email) : undefined,
          emailVerifiedAt: input.emailVerifiedAt ?? undefined,
          metadata: (input.metadata ?? undefined) as never,
        },
      })
    },
  }
}

export type AuthAccountRepo = ReturnType<typeof makeAuthAccountRepo>
