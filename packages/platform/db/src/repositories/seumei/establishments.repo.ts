/**
 * Establishment Repository — minimal real persistence for Seumei.
 *
 * V1.3 scope: just enough to prove "Seumei already can be the first serious
 * proof" — listing and creating establishments scoped to a tenant.
 */
import type { SeumeiPrismaClient, EstablishmentType } from "../../seumei"

export function makeEstablishmentRepo(db: SeumeiPrismaClient) {
  return {
    listByTenant: (tenantId: string) =>
      db.establishment.findMany({
        where: { tenantId },
        orderBy: { createdAt: "asc" },
        include: { profile: true },
      }),

    findById: (id: string, tenantId: string) =>
      db.establishment.findFirst({
        where: { id, tenantId },
        include: { profile: true },
      }),

    create: (input: {
      tenantId: string
      name: string
      slug: string
      type: EstablishmentType
      city: string
      country?: string
      addressLine?: string | null
      phone?: string | null
      profile?: {
        displayName: string
        description?: string | null
        capacity?: number | null
        tags?: string[]
      }
    }) =>
      db.establishment.create({
        data: {
          tenantId: input.tenantId,
          name: input.name,
          slug: input.slug,
          type: input.type,
          city: input.city,
          country: input.country ?? "BR",
          addressLine: input.addressLine ?? null,
          phone: input.phone ?? null,
          ...(input.profile
            ? {
                profile: {
                  create: {
                    tenantId: input.tenantId,
                    displayName: input.profile.displayName,
                    description: input.profile.description ?? null,
                    capacity: input.profile.capacity ?? null,
                    tags: input.profile.tags ?? [],
                  },
                },
              }
            : {}),
        },
        include: { profile: true },
      }),
  }
}

export type EstablishmentRepo = ReturnType<typeof makeEstablishmentRepo>
