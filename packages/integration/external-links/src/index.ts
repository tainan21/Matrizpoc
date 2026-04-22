/**
 * @matriz/integration-external-links
 *
 * Store + helpers para ExternalLinkDTO (v1). O DTO mora em api-contracts; aqui
 * vive a implementacao neutra do CRUD em memoria / persistido via storage.
 *
 * Mirrors ExternalLink model in core.prisma.
 */
import type { AppId } from "@matriz/foundation-types"
import type { ExternalLinkDTO, ExternalLinkRelationType } from "@matriz/integration-api-contracts"
import { externalLinkSchema } from "@matriz/integration-api-contracts"
import { generateId, nowIso } from "@matriz/foundation-utils"
import type { KeyValueStore } from "@matriz/platform-storage"

export type { ExternalLinkDTO, ExternalLinkRelationType }

export interface CreateExternalLinkInput {
  tenantId: string
  localApp: AppId
  localEntityType: string
  localEntityId: string
  externalApp: AppId
  externalEntityType: string
  externalEntityId: string
  relationType: ExternalLinkRelationType
  snapshot?: Record<string, unknown>
}

export interface ExternalLinkStore {
  create(input: CreateExternalLinkInput): ExternalLinkDTO
  get(id: string): ExternalLinkDTO | undefined
  list(): readonly ExternalLinkDTO[]
  listByTenant(tenantId: string): readonly ExternalLinkDTO[]
  findLinksFor(params: {
    tenantId?: string
    localApp?: AppId
    localEntityId?: string
    externalApp?: AppId
    externalEntityId?: string
  }): readonly ExternalLinkDTO[]
  clear(): void
}

const STORE_KEY = "matriz.external-links.v1"

export function createExternalLinkStore(persistence?: KeyValueStore): ExternalLinkStore {
  let cache: ExternalLinkDTO[] = (persistence?.get<ExternalLinkDTO[]>(STORE_KEY) ?? []).map(
    (l) => externalLinkSchema.parse(l),
  )

  const persist = () => {
    if (persistence) persistence.set(STORE_KEY, cache)
  }

  return {
    create(input) {
      const link: ExternalLinkDTO = externalLinkSchema.parse({
        id: generateId("xlink"),
        tenantId: input.tenantId,
        localApp: input.localApp,
        localEntityType: input.localEntityType,
        localEntityId: input.localEntityId,
        externalApp: input.externalApp,
        externalEntityType: input.externalEntityType,
        externalEntityId: input.externalEntityId,
        relationType: input.relationType,
        snapshot: input.snapshot ?? {},
        createdAt: nowIso(),
      })
      cache.push(link)
      persist()
      return link
    },
    get(id) {
      return cache.find((l) => l.id === id)
    },
    list() {
      return cache.slice()
    },
    listByTenant(tenantId) {
      return cache.filter((l) => l.tenantId === tenantId)
    },
    findLinksFor(params) {
      return cache.filter((l) => {
        if (params.tenantId !== undefined && l.tenantId !== params.tenantId) return false
        if (params.localApp !== undefined && l.localApp !== params.localApp) return false
        if (params.localEntityId !== undefined && l.localEntityId !== params.localEntityId) return false
        if (params.externalApp !== undefined && l.externalApp !== params.externalApp) return false
        if (params.externalEntityId !== undefined && l.externalEntityId !== params.externalEntityId) return false
        return true
      })
    },
    clear() {
      cache = []
      persist()
    },
  }
}

// ---------- singleton ----------

const GLOBAL_KEY = Symbol.for("matriz.integration.externalLinks")
type Globals = { [K: symbol]: ExternalLinkStore | undefined }
const globals = globalThis as unknown as Globals

export function getGlobalExternalLinkStore(persistence?: KeyValueStore): ExternalLinkStore {
  if (!globals[GLOBAL_KEY]) {
    globals[GLOBAL_KEY] = createExternalLinkStore(persistence)
  }
  return globals[GLOBAL_KEY]!
}

export const INTEGRATION_EXTERNAL_LINKS_VERSION = "1.0.0" as const
