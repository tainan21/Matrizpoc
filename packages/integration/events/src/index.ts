/**
 * @matriz/integration-events
 *
 * Event bus interno mock. Envelope carrega version: "v1" (L7). Os 6 eventos
 * obrigatorios da POC estao tipados aqui. Apps emitem via createEventBus ou
 * pelo singleton globalEventBus; o Hub le historico para visualizacao.
 */
import { z } from "zod"
import type { AppId } from "@matriz/foundation-types"
import { CONTRACT_VERSION_V1, MATRIZ_EVENT_NAMES } from "@matriz/foundation-constants"
import { generateId, nowIso } from "@matriz/foundation-utils"

// ---------- envelope ----------

export const eventNameSchema = z.enum(MATRIZ_EVENT_NAMES)
export type MatrizEventName = z.infer<typeof eventNameSchema>

export const eventEnvelopeSchema = z.object({
  id: z.string().min(1),
  name: eventNameSchema,
  version: z.literal(CONTRACT_VERSION_V1),
  sourceApp: z.string().min(1),
  tenantId: z.string().min(1),
  occurredAt: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()),
})
export type EventEnvelope<T = unknown> = {
  id: string
  name: MatrizEventName
  version: typeof CONTRACT_VERSION_V1
  sourceApp: AppId
  tenantId: string
  occurredAt: string
  payload: T
}

// ---------- typed payload map ----------

export interface MatrizEventPayloads {
  "wallet.created": { walletId: string; userId: string }
  "wallet.entry.posted": { transactionId: string; walletId: string; currency: "MTRZ" | "BRL"; amountMinor: string; correlationId: string }
  "wallet.entry.reversed": { transactionId: string; walletId: string; reversesTransactionId: string; correlationId: string }
  "wallet.reconciliation.failed": { reconciliationRunId: string; correlationId: string; discrepancyCount?: number; error?: string }
  "onboarding.completed": {
    tenantId: string
    appId: AppId
    completedSteps: readonly string[]
  }
  "spot.gig.created": {
    gigId: string
    tenantId: string
    title: string
    bandName: string
    venueName: string
  }
  "seumei.establishment.selected": {
    establishmentId: string
    tenantId: string
    name: string
  }
  "contract.created": {
    contractId: string
    tenantId: string
    originApp: AppId
    title: string
  }
  "contract.linked": {
    contractId: string
    tenantId: string
    externalLinkId: string
    linksTo: { app: AppId; entityType: string; entityId: string }
  }
  "hub.app.opened": {
    appId: AppId
    tenantId: string
  }
  "willdash.goal.opened": {
    goalId: string
    tenantId: string
    title: string
  }
  "willdash.activity.logged": {
    activityId: string
    tenantId: string
    goalId?: string
    kind: string
  }
  "docs.document.created": {
    documentId: string
    tenantId: string
    title: string
    type: string
    actorId: string
    actorType: string
  }
  "docs.document.imported": {
    documentId: string
    tenantId: string
    sourceKind: string
    actorId: string
    actorType: string
  }
  "docs.document.converted": {
    documentId: string
    tenantId: string
    runId: string
    blockCount: number
  }
  "docs.document.version.created": {
    documentId: string
    versionId: string
    tenantId: string
    versionNumber: number
  }
  "docs.document.version.published": {
    documentId: string
    versionId: string
    tenantId: string
    versionNumber: number
  }
  "docs.document.deprecated": {
    documentId: string
    tenantId: string
    reason?: string
  }
  "docs.block.created": {
    documentId: string
    blockId: string
    tenantId: string
    blockType: string
  }
  "docs.entity.created": {
    nodeId: string
    tenantId: string
    name: string
    type: string
  }
  "docs.entity.detected": {
    nodeId: string
    documentId: string
    blockId?: string
    tenantId: string
    confidence?: number
  }
  "docs.relation.suggested": {
    edgeId: string
    tenantId: string
    sourceNodeId: string
    targetNodeId: string
    relationType: string
  }
  "docs.relation.approved": {
    edgeId: string
    tenantId: string
    approvedByActorId: string
  }
  "docs.relation.rejected": {
    edgeId: string
    tenantId: string
    reviewedByActorId: string
  }
  "docs.suggestion.created": {
    suggestionId: string
    tenantId: string
    type: string
    targetType: string
    targetId: string
  }
  "docs.suggestion.accepted": {
    suggestionId: string
    tenantId: string
    reviewedByActorId: string
  }
  "docs.suggestion.rejected": {
    suggestionId: string
    tenantId: string
    reviewedByActorId: string
    reason?: string
  }
  "docs.context.created": {
    contextPackageId: string
    tenantId: string
    slug: string
  }
  "docs.context.updated": {
    contextPackageId: string
    tenantId: string
    reason?: string
  }
  "docs.context.published": {
    contextPackageId: string
    tenantId: string
    version: number
    mcpUri?: string
  }
  "docs.mcp.read": {
    uri: string
    tenantId: string
    actorId: string
    actorType: string
    targetType: string
    targetId: string
  }
  "docs.mcp.refreshed": {
    uri: string
    tenantId: string
    resourceType: string
  }
  "docs.taskCandidate.created": {
    candidateId: string
    documentId: string
    tenantId: string
    title: string
  }
  "docs.governanceCandidate.created": {
    candidateId: string
    documentId: string
    tenantId: string
    reason: string
    sensitivity: string
  }
  "docs.export.generated": {
    exportArtifactId: string
    tenantId: string
    exportType: string
    targetType: string
    targetId: string
  }
  "docs.timeline.created": {
    timelineEventId: string
    tenantId: string
    targetType: string
    targetId: string
    name: string
  }
}

// ---------- event bus ----------

type Handler<T> = (envelope: EventEnvelope<T>) => void | Promise<void>

export interface EventBus {
  emit<N extends MatrizEventName>(
    name: N,
    opts: {
      sourceApp: AppId
      tenantId: string
      payload: MatrizEventPayloads[N]
    },
  ): EventEnvelope<MatrizEventPayloads[N]>
  on<N extends MatrizEventName>(
    name: N,
    handler: Handler<MatrizEventPayloads[N]>,
  ): () => void
  once<N extends MatrizEventName>(
    name: N,
    handler: Handler<MatrizEventPayloads[N]>,
  ): () => void
  off<N extends MatrizEventName>(
    name: N,
    handler: Handler<MatrizEventPayloads[N]>,
  ): void
  history(): readonly EventEnvelope<unknown>[]
  clear(): void
}

export function createEventBus(): EventBus {
  const handlers = new Map<MatrizEventName, Set<Handler<unknown>>>()
  const log: EventEnvelope<unknown>[] = []

  const getSet = (name: MatrizEventName) => {
    let set = handlers.get(name)
    if (!set) {
      set = new Set()
      handlers.set(name, set)
    }
    return set
  }

  return {
    emit(name, opts) {
      const envelope: EventEnvelope<(typeof opts)["payload"]> = {
        id: generateId("evt"),
        name,
        version: CONTRACT_VERSION_V1,
        sourceApp: opts.sourceApp,
        tenantId: opts.tenantId,
        occurredAt: nowIso(),
        payload: opts.payload,
      }
      log.push(envelope as EventEnvelope<unknown>)
      const set = handlers.get(name)
      if (set) {
        for (const h of set) {
          void Promise.resolve().then(() => (h as Handler<unknown>)(envelope as EventEnvelope<unknown>))
        }
      }
      return envelope
    },
    on(name, handler) {
      const set = getSet(name)
      set.add(handler as Handler<unknown>)
      return () => set.delete(handler as Handler<unknown>)
    },
    once(name, handler) {
      const off = this.on(name, (env) => {
        off()
        void (handler as Handler<unknown>)(env)
      })
      return off
    },
    off(name, handler) {
      handlers.get(name)?.delete(handler as Handler<unknown>)
    },
    history() {
      return log.slice()
    },
    clear() {
      log.length = 0
      handlers.clear()
    },
  }
}

// ---------- singleton ----------

const GLOBAL_KEY = Symbol.for("matriz.integration.eventBus")
type Globals = { [K: symbol]: EventBus | undefined }
const globals = globalThis as unknown as Globals

export function getGlobalEventBus(): EventBus {
  if (!globals[GLOBAL_KEY]) {
    globals[GLOBAL_KEY] = createEventBus()
  }
  return globals[GLOBAL_KEY]!
}

export const INTEGRATION_EVENTS_VERSION = "1.0.0" as const
