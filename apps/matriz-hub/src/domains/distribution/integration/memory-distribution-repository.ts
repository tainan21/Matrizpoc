import { randomUUID } from "node:crypto"

import type {
  DistributionProductInputV1,
  DistributionProductV1,
  DistributionReleaseInputV1,
} from "@matriz/integration-api-contracts"
import type { DistributionRepository } from "../application/distribution-service"

export function createMemoryDistributionRepository(): DistributionRepository {
  const products = new Map<string, DistributionProductV1>()
  const releaseProducts = new Map<string, string>()
  const releases = new Map<string, NonNullable<DistributionProductV1["release"]>>()
  const idempotent = new Map<string, unknown>()
  const audits: Array<{ actorId: string; action: string; targetId: string }> = []

  function replay<T>(operation: string, key: string): T | undefined {
    return idempotent.get(`${operation}:${key}`) as T | undefined
  }
  function record<T>(key: string, value: T, actorId: string, action: string, targetId: string): T {
    idempotent.set(`${action}:${key}`, value)
    audits.push({ actorId, action, targetId })
    return value
  }

  return {
    async createProduct(input: DistributionProductInputV1, actorId: string, key: string) {
      const existing = replay<DistributionProductV1>("product.created", key)
      if (existing) return existing
      if (products.has(input.productId)) throw new Error("Distribution product already exists")
      const created: DistributionProductV1 = { ...input, state: "active", release: null }
      products.set(input.productId, created)
      return record(key, created, actorId, "product.created", input.productId)
    },
    async updateProduct(productId, input, actorId, key) {
      const existing = replay<DistributionProductV1>("product.updated", key)
      if (existing) return existing
      const current = products.get(productId)
      if (!current) throw new Error("Distribution product was not found")
      const updated = {
        ...current,
        ...input,
        windows: input.windows ? { ...current.windows, ...input.windows } : current.windows,
      }
      products.set(productId, updated)
      return record(key, updated, actorId, "product.updated", productId)
    },
    async createRelease(
      productId: string,
      input: DistributionReleaseInputV1,
      actorId: string,
      key: string,
    ) {
      const existing = replay<NonNullable<DistributionProductV1["release"]>>("release.created", key)
      if (existing) return existing
      if (!products.has(productId)) throw new Error("Distribution product was not found")
      const created = {
        ...input,
        releaseId: randomUUID(),
        status: "draft" as const,
        publishedAt: null,
      }
      releaseProducts.set(created.releaseId, productId)
      releases.set(created.releaseId, created)
      return record(key, created, actorId, "release.created", created.releaseId)
    },
    async publishRelease(releaseId: string, actorId: string, key: string, publishedAt: string) {
      const existing = replay<NonNullable<DistributionProductV1["release"]>>(
        "release.published",
        key,
      )
      if (existing) return existing
      const productId = releaseProducts.get(releaseId)
      if (!productId) throw new Error("Distribution release was not found")
      const current = products.get(productId)
      if (!current) throw new Error("Distribution product was not found")
      const draft = releases.get(releaseId)
      if (!draft) throw new Error("Distribution release was not found")
      const currentStable = current.release?.channel === "stable" ? current.release : null
      if (
        draft.channel === "stable" &&
        currentStable &&
        compareSemver(draft.version, currentStable.version) < 0
      )
        throw new Error("Stable release cannot downgrade")
      const published = { ...draft, status: "published" as const, publishedAt }
      releases.set(releaseId, published)
      if (draft.channel === "stable") products.set(productId, { ...current, release: published })
      return record(key, published, actorId, "release.published", releaseId)
    },
    async retireRelease(releaseId, actorId, key) {
      const existing = replay<NonNullable<DistributionProductV1["release"]>>("release.retired", key)
      if (existing) return existing
      const current = releases.get(releaseId)
      const productId = releaseProducts.get(releaseId)
      if (!current || !productId) throw new Error("Distribution release was not found")
      const retired = { ...current, status: "retired" as const }
      releases.set(releaseId, retired)
      const product = products.get(productId)
      if (product?.release?.releaseId === releaseId)
        products.set(productId, { ...product, release: null })
      return record(key, retired, actorId, "release.retired", releaseId)
    },
    async product(productId) {
      return products.get(productId) ?? null
    },
    async catalog(generatedAt: string) {
      return { schemaVersion: "v1" as const, generatedAt, products: [...products.values()] }
    },
    async audit() {
      return [...audits]
    },
  }
}

function compareSemver(left: string, right: string) {
  const parts = (value: string) => value.split("-")[0].split(".").map(Number)
  const [leftMajor = 0, leftMinor = 0, leftPatch = 0] = parts(left)
  const [rightMajor = 0, rightMinor = 0, rightPatch = 0] = parts(right)
  return leftMajor - rightMajor || leftMinor - rightMinor || leftPatch - rightPatch
}
