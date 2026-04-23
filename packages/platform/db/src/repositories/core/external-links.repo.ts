/**
 * ExternalLink Repository — typed cross-app references stored on the core
 * schema (L12: no cross-schema FK). Apps write here to say "my entity X
 * points to app Y's entity Z".
 *
 * Naming aligned with the existing core schema:
 *   local* = the app/entity that created the link (the source side)
 *   external* = the app/entity being pointed to (the target side)
 *   relationType = semantic relation (e.g., "originates-from", "binds")
 *   snapshot = optional frozen copy of the target entity at link time
 */
import type { CorePrismaClient } from "../../core"

export type ExternalLinkInput = {
  tenantId: string
  localApp: string
  localEntityType: string
  localEntityId: string
  externalApp: string
  externalEntityType: string
  externalEntityId: string
  relationType: string
  snapshot?: Record<string, unknown> | null
}

export function makeExternalLinkRepo(db: CorePrismaClient) {
  return {
    create: (input: ExternalLinkInput) =>
      db.externalLink.create({
        data: {
          tenantId: input.tenantId,
          localApp: input.localApp,
          localEntityType: input.localEntityType,
          localEntityId: input.localEntityId,
          externalApp: input.externalApp,
          externalEntityType: input.externalEntityType,
          externalEntityId: input.externalEntityId,
          relationType: input.relationType,
          snapshot: (input.snapshot ?? null) as never,
        },
      }),

    listFromEntity: (
      tenantId: string,
      localApp: string,
      localEntityType: string,
      localEntityId: string,
    ) =>
      db.externalLink.findMany({
        where: { tenantId, localApp, localEntityType, localEntityId },
      }),

    listToEntity: (
      tenantId: string,
      externalApp: string,
      externalEntityType: string,
      externalEntityId: string,
    ) =>
      db.externalLink.findMany({
        where: { tenantId, externalApp, externalEntityType, externalEntityId },
      }),
  }
}

export type ExternalLinkRepo = ReturnType<typeof makeExternalLinkRepo>
