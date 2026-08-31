import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { AuthSession } from "@matriz/platform-auth"
import { getGlobalEventBus } from "@matriz/integration-events"
import { getGlobalExternalLinkStore } from "@matriz/integration-external-links"
import { hubSessionStore } from "../../apps/matriz-hub/src/auth/hub-session"
import { DocsPrismaRepository } from "../../apps/matriz-hub/src/domains/docs/integration/prisma/docs-repository"
import { GET as getEvents } from "../../apps/matriz-hub/app/api/events/route"
import { GET as getExternalLinks } from "../../apps/matriz-hub/app/api/external-links/route"
import { createTelemetryGet } from "../../apps/matriz-hub/app/api/telemetry/route"
import { GET as getSharedCache, PUT as putSharedCache } from "../../apps/matriz-hub/app/api/ecosystem/cache/route"
import type { CacheRecord, HubCacheRepository } from "../../apps/matriz-hub/src/ecosystem/garnet-cache-repository"

const now = new Date(Date.now() + 60_000).toISOString()
const tenantA = "tenant-a"
const tenantB = "tenant-b"

const previousAuthAdapter = process.env.NEXT_PUBLIC_MATRIZ_AUTH_ADAPTER
const globalCache = globalThis as typeof globalThis & { __matrizSharedCacheRepository?: HubCacheRepository }
const previousCacheRepository = globalCache.__matrizSharedCacheRepository

beforeAll(() => {
  process.env.NEXT_PUBLIC_MATRIZ_AUTH_ADAPTER = "mock"
  const entries = new Map<string, CacheRecord>()
  globalCache.__matrizSharedCacheRepository = {
    read: async (tenantId, namespace, key) => entries.get(`${tenantId}:${namespace}:${key}`),
    write: async (tenantId, namespace, record) => { entries.set(`${tenantId}:${namespace}:${record.key}`, record) },
    delete: async (tenantId, namespace, key) => { entries.delete(`${tenantId}:${namespace}:${key}`) },
  }
})
afterAll(() => {
  if (previousAuthAdapter === undefined) delete process.env.NEXT_PUBLIC_MATRIZ_AUTH_ADAPTER
  else process.env.NEXT_PUBLIC_MATRIZ_AUTH_ADAPTER = previousAuthAdapter
  if (previousCacheRepository === undefined) delete globalCache.__matrizSharedCacheRepository
  else globalCache.__matrizSharedCacheRepository = previousCacheRepository
})

function issueSession(tenantId: string, userId: string): string {
  const session: AuthSession = {
    identity: {
      user: { id: userId as AuthSession["identity"]["user"]["id"], name: userId, email: `${userId}@example.test` },
      tenants: [{ tenantId: tenantId as AuthSession["activeTenantId"], tenantName: tenantId, roles: ["owner"], enabledApps: ["matriz-hub" as never] }],
    },
    activeTenantId: tenantId as AuthSession["activeTenantId"],
    issuedAt: new Date().toISOString(),
    expiresAt: now,
    strategyId: "mock",
  }
  return hubSessionStore.create(session)
}

function tenantRequest(path: string, token: string, init: RequestInit = {}): Request {
  return new Request(`http://localhost:3000${path}`, {
    ...init,
    headers: { origin: "http://localhost:3000", cookie: `matriz_mock_session=${token}`, ...(init.headers ?? {}) },
  })
}

function transactional<T extends Record<string, unknown>>(source: T): T {
  const client = {
    ...source,
    $executeRawUnsafe: async () => 0,
    docTimelineEvent: source.docTimelineEvent ?? { create: async () => ({}) },
    hubOutboxEvent: source.hubOutboxEvent ?? { create: async () => ({}) },
  } as T & { $transaction?: (callback: (tx: unknown) => unknown) => unknown }
  client.$transaction = async (callback) => callback(client)
  return client
}

describe("Hub tenant isolation", () => {
  it("RED: projects only the authenticated tenant's external links, events, and telemetry", async () => {
    const tokenA = issueSession(tenantA, "user-a")
    const links = getGlobalExternalLinkStore()
    const events = getGlobalEventBus()
    links.clear()
    events.clear()
    links.create({ tenantId: tenantA, localApp: "matriz-hub", localEntityType: "doc", localEntityId: "a", externalApp: "spot", externalEntityType: "gig", externalEntityId: "a", relationType: "contract.reference" })
    links.create({ tenantId: tenantB, localApp: "matriz-hub", localEntityType: "doc", localEntityId: "b", externalApp: "spot", externalEntityType: "gig", externalEntityId: "b", relationType: "contract.reference" })
    events.emit("docs.document.created", { sourceApp: "matriz-hub", tenantId: tenantA, payload: { documentId: "doc-a", tenantId: tenantA, title: "A", type: "institutional", actorId: "user-a", actorType: "human_user" } })
    events.emit("docs.document.created", { sourceApp: "matriz-hub", tenantId: tenantB, payload: { documentId: "doc-b", tenantId: tenantB, title: "B", type: "institutional", actorId: "user-b", actorType: "human_user" } })
    const telemetryRecords = [tenantA, tenantB].map((tenantId) => ({
      id: `telemetry-${tenantId}`, eventVersion: 1, appId: "matriz-hub", tenantId,
      eventName: `${tenantId}-event`, occurredAt: new Date(), properties: {}, category: null,
    }))
    const getTelemetry = createTelemetryGet({ telemetryRecord: { findMany: async ({ where }: { where: { tenantId: string } }) => telemetryRecords.filter((record) => record.tenantId === where.tenantId) } } as never)

    const [linksResponse, eventsResponse, telemetryResponse] = await Promise.all([
      getExternalLinks(tenantRequest("/api/external-links", tokenA)),
      getEvents(tenantRequest("/api/events", tokenA)),
      getTelemetry(tenantRequest("/api/telemetry", tokenA)),
    ])
    expect((await linksResponse.json()).links.map((link: { tenantId: string }) => link.tenantId)).toEqual([tenantA])
    expect((await eventsResponse.json()).events.map((event: { tenantId: string }) => event.tenantId)).toEqual([tenantA])
    expect((await telemetryResponse.json()).events.map((event: { tenantId: string }) => event.tenantId)).toEqual([tenantA])
  })

  it("RED: keeps identical cache keys isolated by the opaque session tenant", async () => {
    const tokenA = issueSession(tenantA, "cache-user-a")
    const tokenB = issueSession(tenantB, "cache-user-b")
    const key = `same-key-${Date.now()}`
    for (const [token, value] of [[tokenA, "from-a"], [tokenB, "from-b"]] as const) {
      const response = await putSharedCache(tenantRequest("/api/ecosystem/cache", token, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, value, updatedBy: "matriz-hub" }),
      }))
      expect(response.status).toBe(200)
    }
    const response = await getSharedCache(tenantRequest(`/api/ecosystem/cache?key=${key}`, tokenA))
    expect(response.status).toBe(200)
    expect((await response.json()).value).toBe("from-a")
  })

  it("RED: refuses a foreign suggestion before issuing any write", async () => {
    const foreign = { id: "suggestion-b", tenantId: tenantB, status: "suggested" }
    let writes = 0
    const db = {
      docSuggestion: {
        findFirst: async ({ where }: { where: { id: string; tenantId: string } }) => where.id === foreign.id && where.tenantId === foreign.tenantId ? foreign : null,
        update: async () => { writes += 1; foreign.status = "accepted"; return foreign },
      },
    }
    const repository = new DocsPrismaRepository(transactional(db) as never)
    await expect(repository.reviewSuggestion({ tenantId: tenantA, actorId: "user-a", actorType: "human_user" }, foreign.id, "accepted")).rejects.toThrow(/target not found|tenant boundary/i)
    expect(writes).toBe(0)
    expect(foreign.status).toBe("suggested")
  })

  it("updates an owned suggestion through a tenant-scoped write", async () => {
    const owned = {
      id: "suggestion-a", tenantId: tenantA, type: "governance", status: "suggested", title: "Owned", description: "Owned by A",
      confidence: null, evidence: {}, targetType: "document", targetId: "doc-a", createdByActorId: "user-a", reviewedByActorId: null,
      result: null, createdAt: new Date(), updatedAt: new Date(),
    }
    let writes = 0
    const db = {
      docSuggestion: {
        findFirst: async ({ where }: { where: { id: string; tenantId: string } }) => where.id === owned.id && where.tenantId === owned.tenantId ? owned : null,
        updateMany: async ({ where, data }: { where: { id: string; tenantId: string }; data: { status: string; reviewedByActorId: string; result: Record<string, unknown> } }) => {
          if (where.id !== owned.id || where.tenantId !== owned.tenantId) return { count: 0 }
          writes += 1
          owned.status = data.status
          owned.reviewedByActorId = data.reviewedByActorId
          owned.result = data.result
          return { count: 1 }
        },
      },
      docTimelineEvent: { create: async () => ({}) },
    }
    const repository = new DocsPrismaRepository(transactional(db) as never)
    const updated = await repository.reviewSuggestion({ tenantId: tenantA, actorId: "user-a", actorType: "human_user" }, owned.id, "rejected")
    expect(writes).toBe(1)
    expect(updated).toMatchObject({ id: owned.id, tenantId: tenantA, status: "rejected", reviewedByActorId: "user-a" })
  })

  it("RED: refuses a knowledge edge with a foreign endpoint before creating it", async () => {
    const nodes = [{ id: "node-a", tenantId: tenantA }, { id: "node-b", tenantId: tenantB }]
    let creates = 0
    const edge = { id: "edge", tenantId: tenantA, sourceNodeId: "node-a", targetNodeId: "node-b", relationType: "mentions", status: "suggested", confidence: null, evidence: {}, createdByActorId: "user-a", approvedByActorId: null }
    const tx = {
      knowledgeNode: { findMany: async ({ where }: { where: { tenantId: string; id: { in: string[] } } }) => nodes.filter((node) => node.tenantId === where.tenantId && where.id.in.includes(node.id)) },
      knowledgeEdge: { create: async () => { creates += 1; return edge } },
    }
    const db = {
      ...tx,
      $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx),
      docTimelineEvent: { create: async () => ({}) },
    }
    const repository = new DocsPrismaRepository(transactional(db) as never)
    await expect(repository.createKnowledgeEdge({ tenantId: tenantA, actorId: "user-a", actorType: "human_user" }, {
      sourceNodeId: "node-a", targetNodeId: "node-b", relationType: "mentions",
    })).rejects.toThrow(/tenant|node|relation/i)
    expect(creates).toBe(0)
  })

  it("creates a knowledge edge only when both distinct endpoints belong to the tenant", async () => {
    const nodes = [{ id: "node-a", tenantId: tenantA }, { id: "node-c", tenantId: tenantA }]
    let creates = 0
    const edge = { id: "edge", tenantId: tenantA, sourceNodeId: "node-a", targetNodeId: "node-c", relationType: "mentions", status: "suggested", confidence: null, evidence: {}, createdByActorId: "user-a", approvedByActorId: null }
    const tx = {
      knowledgeNode: { findMany: async ({ where }: { where: { tenantId: string; id: { in: string[] } } }) => nodes.filter((node) => node.tenantId === where.tenantId && where.id.in.includes(node.id)) },
      knowledgeEdge: { create: async () => { creates += 1; return edge } },
    }
    const db = {
      ...tx,
      $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx),
      docTimelineEvent: { create: async () => ({}) },
    }
    const repository = new DocsPrismaRepository(transactional(db) as never)
    const created = await repository.createKnowledgeEdge({ tenantId: tenantA, actorId: "user-a", actorType: "human_user" }, {
      sourceNodeId: "node-a", targetNodeId: "node-c", relationType: "mentions",
    })
    expect(creates).toBe(1)
    expect(created).toMatchObject({ tenantId: tenantA, sourceNodeId: "node-a", targetNodeId: "node-c" })
  })

  it("RED: refuses a document suggestion for tenant B before creating it", async () => {
    let creates = 0
    const suggestion = { id: "suggestion", tenantId: tenantA, type: "task", status: "suggested", title: "Task", description: "Task", confidence: null, evidence: {}, targetType: "document", targetId: "doc-b", createdByActorId: "user-a", reviewedByActorId: null, result: null, createdAt: new Date(), updatedAt: new Date() }
    const tx = {
      docDocument: { findFirst: async () => null },
      docSuggestion: { create: async () => { creates += 1; return suggestion } },
    }
    const db = { ...tx, $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx), docTimelineEvent: { create: async () => ({}) } }
    const repository = new DocsPrismaRepository(transactional(db) as never)
    await expect(repository.createSuggestion({ tenantId: tenantA, actorId: "user-a", actorType: "human_user" }, {
      type: "task", title: "Task", description: "Task", targetType: "document", targetId: "doc-b",
    })).rejects.toThrow(/document|tenant|target/i)
    expect(creates).toBe(0)
  })

  it("creates a document suggestion only for a tenant-owned document", async () => {
    let creates = 0
    const document = { id: "doc-a", tenantId: tenantA }
    const suggestion = { id: "suggestion", tenantId: tenantA, type: "task", status: "suggested", title: "Task", description: "Task", confidence: null, evidence: {}, targetType: "document", targetId: "doc-a", createdByActorId: "user-a", reviewedByActorId: null, result: null, createdAt: new Date(), updatedAt: new Date() }
    const tx = {
      docDocument: { findFirst: async () => document },
      docSuggestion: { create: async () => { creates += 1; return suggestion } },
    }
    const db = { ...tx, $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx), docTimelineEvent: { create: async () => ({}) } }
    const repository = new DocsPrismaRepository(transactional(db) as never)
    const created = await repository.createSuggestion({ tenantId: tenantA, actorId: "user-a", actorType: "human_user" }, {
      type: "task", title: "Task", description: "Task", targetType: "document", targetId: "doc-a",
    })
    expect(creates).toBe(1)
    expect(created).toMatchObject({ tenantId: tenantA, targetId: "doc-a" })
  })

  it("RED: refuses a context package with a foreign document before creating the package", async () => {
    let packages = 0
    const context = { id: "context", tenantId: tenantA, slug: "context", title: "Context", description: null, audience: "internal", status: "draft", visibility: "internal", version: 1, summary: null, mcpUri: null, lastPublishedAt: null, createdAt: new Date(), updatedAt: new Date(), items: [] }
    const tx = {
      docDocument: { findMany: async () => [] },
      docContextPackage: { findUnique: async () => null, create: async () => { packages += 1; return context }, findFirst: async () => context },
      docContextPackageItem: { create: async () => ({}) },
    }
    const db = { ...tx, $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx), docTimelineEvent: { create: async () => ({}) } }
    const repository = new DocsPrismaRepository(transactional(db) as never)
    await expect(repository.createContextPackage({ tenantId: tenantA, actorId: "user-a", actorType: "human_user" }, {
      title: "Context", documentIds: ["doc-b"],
    })).rejects.toThrow(/document|tenant|context/i)
    expect(packages).toBe(0)
  })

  it("creates a context package only when every requested document belongs to the tenant", async () => {
    let packages = 0
    let items = 0
    const document = { id: "doc-a", tenantId: tenantA, currentVersionId: "version-a", title: "Doc A" }
    const context = { id: "context", tenantId: tenantA, slug: "context", title: "Context", description: null, audience: "internal", status: "draft", visibility: "internal", version: 1, summary: null, mcpUri: null, lastPublishedAt: null, createdAt: new Date(), updatedAt: new Date(), items: [] }
    const tx = {
      docDocument: { findMany: async () => [document] },
      docContextPackage: { findUnique: async () => null, create: async () => { packages += 1; return context }, findFirst: async () => context },
      docContextPackageItem: { create: async () => { items += 1; return {} } },
    }
    const db = { ...tx, $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx), docTimelineEvent: { create: async () => ({}) } }
    const repository = new DocsPrismaRepository(transactional(db) as never)
    const created = await repository.createContextPackage({ tenantId: tenantA, actorId: "user-a", actorType: "human_user" }, {
      title: "Context", documentIds: ["doc-a"],
    })
    expect(packages).toBe(1)
    expect(items).toBe(1)
    expect(created).toMatchObject({ id: "context", tenantId: tenantA })
  })
})
