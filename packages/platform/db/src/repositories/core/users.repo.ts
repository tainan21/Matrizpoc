/**
 * User Repository — operates on core.users (global identity).
 *
 * Only 3 ops this round:
 *  - findByEmail (normalized)
 *  - upsertByEmail (for identity linking on auth success)
 *  - findById
 */
import type { CorePrismaClient } from "../../core"

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export function makeUserRepo(db: CorePrismaClient) {
  return {
    findByEmail: (email: string) =>
      db.user.findUnique({ where: { email: normalizeEmail(email) } }),

    findById: (id: string) => db.user.findUnique({ where: { id } }),

    /**
     * Upsert by normalized email. Used after successful auth challenge.
     * Returns the user — never throws on existing email.
     */
    upsertByEmail: async (input: {
      email: string
      displayName?: string
      avatarUrl?: string | null
      locale?: string | null
      timezone?: string | null
    }) => {
      const email = normalizeEmail(input.email)
      return db.user.upsert({
        where: { email },
        create: {
          email,
          displayName: input.displayName ?? email.split("@")[0] ?? "User",
          avatarUrl: input.avatarUrl ?? null,
          locale: input.locale ?? null,
          timezone: input.timezone ?? null,
        },
        update: {
          // Keep existing displayName unless the provider gives us a better one
          ...(input.displayName ? { displayName: input.displayName } : {}),
          ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
          ...(input.locale !== undefined ? { locale: input.locale } : {}),
          ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        },
      })
    },
  }
}

export type UserRepo = ReturnType<typeof makeUserRepo>
