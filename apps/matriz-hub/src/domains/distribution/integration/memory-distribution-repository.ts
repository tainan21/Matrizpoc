import { randomUUID } from "node:crypto"

import type { DistributionProductInputV1, DistributionProductV1, DistributionReleaseInputV1 } from "@matriz/integration-api-contracts"
import type { DistributionRepository } from "../application/distribution-service"

export function createMemoryDistributionRepository(): DistributionRepository {
  const products = new Map<string, DistributionProductV1>()
  const releaseProducts = new Map<string, string>()
  const idempotent = new Map<string, unknown>()
  const audits: Array<{ actorId: string; action: string; targetId: string }> = []

  function replay<T>(key: string): T | undefined { return idempotent.get(key) as T | undefined }
  function record<T>(key: string, value: T, actorId: string, action: string, targetId: string): T {
    idempotent.set(key, value)
    audits.push({ actorId, action, targetId })
    return value
  }

  return {
    async createProduct(input: DistributionProductInputV1, actorId: string, key: string) {
      const existing = replay<DistributionProductV1>(key)
      if (existing) return existing
      if (products.has(input.productId)) throw new Error("Distribution product already exists")
      const created: DistributionProductV1 = { ...input, state: "active", release: null }
      products.set(input.productId, created)
      return record(key, created, actorId, "product.created", input.productId)
    },
    async createRelease(productId: string, input: DistributionReleaseInputV1, actorId: string, key: string) {
      const existing = replay<NonNullable<DistributionProductV1["release"]>>(key)
      if (existing) return existing
      if (!products.has(productId)) throw new Error("Distribution product was not found")
      const created = { ...input, releaseId: randomUUID(), status: "draft" as const, publishedAt: null }
      releaseProducts.set(created.releaseId, productId)
      return record(key, created, actorId, "release.created", created.releaseId)
    },
    async publishRelease(releaseId: string, actorId: string, key: string, publishedAt: string) {
      const existing = replay<NonNullable<DistributionProductV1["release"]>>(key)
      if (existing) return existing
      const productId = releaseProducts.get(releaseId)
      if (!productId) throw new Error("Distribution release was not found")
      const current = products.get(productId)
      if (!current) throw new Error("Distribution product was not found")
      const draft = [...idempotent.values()].find((value) => isRelease(value) && value.releaseId === releaseId)
      if (!draft || !isRelease(draft)) throw new Error("Distribution release was not found")
      const published = { ...draft, status: "published" as const, publishedAt }
      products.set(productId, { ...current, release: published })
      return record(key, published, actorId, "release.published", releaseId)
    },
    async catalog(generatedAt: string) {
      return { schemaVersion: "v1" as const, generatedAt, products: [...products.values()] }
    },
    async audit() { return [...audits] },
  }
}

function isRelease(value: unknown): value is NonNullable<DistributionProductV1["release"]> {
  return Boolean(value && typeof value === "object" && "releaseId" in value)
}
