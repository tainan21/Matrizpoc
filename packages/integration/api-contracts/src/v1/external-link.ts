/**
 * ExternalLinkDTO (v1).
 *
 * Um registro em Contracts pode referenciar gig do Spot, establishment
 * da Seumei ou tenant do Core. O shape segue o escopo literalmente.
 */
import { z } from "zod"
import { EXTERNAL_LINK_RELATION_TYPES } from "@matriz/foundation-constants"
import { appIdSchema } from "./manifest"

export const externalLinkRelationTypeSchema = z.enum(EXTERNAL_LINK_RELATION_TYPES)
export type ExternalLinkRelationType = z.infer<typeof externalLinkRelationTypeSchema>

export const externalLinkSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  localApp: appIdSchema,
  localEntityType: z.string().min(1),
  localEntityId: z.string().min(1),
  externalApp: appIdSchema,
  externalEntityType: z.string().min(1),
  externalEntityId: z.string().min(1),
  relationType: externalLinkRelationTypeSchema,
  snapshot: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime(),
})
export type ExternalLinkDTO = z.infer<typeof externalLinkSchema>
