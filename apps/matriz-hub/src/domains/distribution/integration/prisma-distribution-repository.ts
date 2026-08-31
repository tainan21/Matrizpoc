import { createHash } from "node:crypto"

import {
  distributionProductV1Schema,
  distributionReleaseV1Schema,
  type DistributionProductInputV1,
  type DistributionProductPatchV1,
  type DistributionProductV1,
  type DistributionReleaseInputV1,
} from "@matriz/integration-api-contracts"
import { getHubDb, type HubPrismaClient } from "@matriz/platform-db/hub"
import type { DistributionRepository } from "../application/distribution-service"

type ProductRow = {
  id: string
  productId: string
  displayName: string
  edition: string
  runtime: string
  platform: string
  arch: string
  state: string
  uninstallKey: string
  windowsName: string
  publisher: string
  executableName: string
  aliases: string[]
  releases?: ReleaseRow[]
}
type ReleaseRow = {
  id: string
  version: string
  channel: string
  status: string
  releasedAt: Date
  publishedAt: Date | null
  releaseNotes: string | null
  installer: unknown
  signature: string
}

export function createPrismaDistributionRepository(
  db: HubPrismaClient = getHubDb(),
): DistributionRepository {
  const productView = (row: ProductRow): DistributionProductV1 =>
    distributionProductV1Schema.parse({
      productId: row.productId,
      displayName: row.displayName,
      edition: row.edition,
      runtime: row.runtime,
      platform: row.platform,
      arch: row.arch,
      state: row.state,
      windows: {
        uninstallKey: row.uninstallKey,
        displayName: row.windowsName,
        publisher: row.publisher,
        executableName: row.executableName,
        aliases: row.aliases,
      },
      release: row.releases?.[0] ? releaseView(row.releases[0]) : null,
    })
  const releaseView = (row: ReleaseRow) =>
    distributionReleaseV1Schema.parse({
      releaseId: row.id,
      version: row.version,
      channel: row.channel,
      status: row.status,
      releasedAt: row.releasedAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      releaseNotes: row.releaseNotes,
      installer: row.installer,
      signature: row.signature,
    })
  const digest = (value: unknown) =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex")
  const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as object

  async function replay<T>(key: string): Promise<T | null> {
    const entry = await db.distributionIdempotency.findUnique({ where: { idempotencyKey: key } })
    return entry ? (entry.result as T) : null
  }

  return {
    async createProduct(input: DistributionProductInputV1, actorId: string, key: string) {
      const previous = await replay<DistributionProductV1>(key)
      if (previous) return distributionProductV1Schema.parse(previous)
      return db.$transaction(async (tx) => {
        const row = await tx.distributionProduct.create({
          data: {
            productId: input.productId,
            displayName: input.displayName,
            edition: input.edition,
            runtime: input.runtime,
            platform: input.platform,
            arch: input.arch,
            uninstallKey: input.windows.uninstallKey,
            windowsName: input.windows.displayName,
            publisher: input.windows.publisher,
            executableName: input.windows.executableName,
            aliases: [...input.windows.aliases],
          },
        })
        const result = productView(row)
        await tx.distributionAudit.create({
          data: {
            actorId,
            action: "product.created",
            productId: row.id,
            afterDigest: digest(result),
          },
        })
        await tx.distributionIdempotency.create({
          data: {
            idempotencyKey: key,
            actorId,
            operation: "product.created",
            result: json(result),
          },
        })
        return result
      })
    },
    async updateProduct(
      productId: string,
      input: DistributionProductPatchV1,
      actorId: string,
      key: string,
    ) {
      const previous = await replay<DistributionProductV1>(key)
      if (previous) return distributionProductV1Schema.parse(previous)
      return db.$transaction(async (tx) => {
        const current = await tx.distributionProduct.findUniqueOrThrow({
          where: { productId },
          include: publishedRelease,
        })
        const row = await tx.distributionProduct.update({
          where: { productId },
          data: {
            displayName: input.displayName,
            edition: input.edition,
            runtime: input.runtime,
            platform: input.platform,
            arch: input.arch,
            state: input.state,
            uninstallKey: input.windows?.uninstallKey,
            windowsName: input.windows?.displayName,
            publisher: input.windows?.publisher,
            executableName: input.windows?.executableName,
            aliases: input.windows?.aliases ? [...input.windows.aliases] : undefined,
          },
          include: publishedRelease,
        })
        const result = productView(row)
        await tx.distributionAudit.create({
          data: {
            actorId,
            action: "product.updated",
            productId: row.id,
            beforeDigest: digest(productView(current)),
            afterDigest: digest(result),
          },
        })
        await tx.distributionIdempotency.create({
          data: {
            idempotencyKey: key,
            actorId,
            operation: "product.updated",
            result: json(result),
          },
        })
        return result
      })
    },
    async createRelease(
      productId: string,
      input: DistributionReleaseInputV1,
      actorId: string,
      key: string,
    ) {
      const previous = await replay<NonNullable<DistributionProductV1["release"]>>(key)
      if (previous) return distributionReleaseV1Schema.parse(previous)
      return db.$transaction(async (tx) => {
        const product = await tx.distributionProduct.findUniqueOrThrow({ where: { productId } })
        const row = await tx.distributionRelease.create({
          data: {
            productId: product.id,
            version: input.version,
            channel: input.channel,
            releasedAt: new Date(input.releasedAt),
            releaseNotes: input.releaseNotes,
            installer: input.installer,
            signature: input.signature,
          },
        })
        const result = releaseView(row)
        await tx.distributionAudit.create({
          data: {
            actorId,
            action: "release.created",
            productId: product.id,
            releaseId: row.id,
            afterDigest: digest(result),
          },
        })
        await tx.distributionIdempotency.create({
          data: {
            idempotencyKey: key,
            actorId,
            operation: "release.created",
            result: json(result),
          },
        })
        return result
      })
    },
    async publishRelease(releaseId: string, actorId: string, key: string, publishedAt: string) {
      return changeRelease(
        db,
        releaseView,
        digest,
        json,
        replay,
        releaseId,
        actorId,
        key,
        "published",
        "release.published",
        new Date(publishedAt),
      )
    },
    async retireRelease(releaseId: string, actorId: string, key: string) {
      return changeRelease(
        db,
        releaseView,
        digest,
        json,
        replay,
        releaseId,
        actorId,
        key,
        "retired",
        "release.retired",
        null,
      )
    },
    async product(productId: string) {
      const row = await db.distributionProduct.findUnique({
        where: { productId },
        include: publishedRelease,
      })
      return row ? productView(row) : null
    },
    async catalog(generatedAt: string) {
      const rows = await db.distributionProduct.findMany({
        where: { state: { not: "retired" } },
        include: publishedRelease,
        orderBy: { displayName: "asc" },
      })
      return { schemaVersion: "v1", generatedAt, products: rows.map(productView) }
    },
    async audit() {
      return db.distributionAudit.findMany({ orderBy: { occurredAt: "desc" }, take: 200 })
    },
  }
}

const publishedRelease = {
  releases: {
    where: { status: "published", channel: "stable" },
    orderBy: { publishedAt: "desc" as const },
    take: 1,
  },
}

async function changeRelease(
  db: HubPrismaClient,
  view: (row: ReleaseRow) => NonNullable<DistributionProductV1["release"]>,
  digest: (value: unknown) => string,
  json: (value: unknown) => object,
  replay: <T>(key: string) => Promise<T | null>,
  releaseId: string,
  actorId: string,
  key: string,
  status: "published" | "retired",
  action: string,
  publishedAt: Date | null,
) {
  const previous = await replay<NonNullable<DistributionProductV1["release"]>>(key)
  if (previous) return distributionReleaseV1Schema.parse(previous)
  return db.$transaction(async (tx) => {
    const before = await tx.distributionRelease.findUniqueOrThrow({ where: { id: releaseId } })
    if (status === "published" && before.channel === "stable") {
      const current = await tx.distributionRelease.findFirst({
        where: { productId: before.productId, channel: "stable", status: "published" },
        orderBy: { publishedAt: "desc" },
      })
      if (current && compareSemver(before.version, current.version) < 0)
        throw new Error("Stable release cannot downgrade")
    }
    if (status === "published")
      await tx.distributionRelease.updateMany({
        where: { productId: before.productId, channel: before.channel, status: "published" },
        data: { status: "retired" },
      })
    const row = await tx.distributionRelease.update({
      where: { id: releaseId },
      data: { status, publishedAt },
    })
    const result = view(row)
    await tx.distributionAudit.create({
      data: {
        actorId,
        action,
        productId: row.productId,
        releaseId: row.id,
        beforeDigest: digest(view(before)),
        afterDigest: digest(result),
      },
    })
    await tx.distributionIdempotency.create({
      data: { idempotencyKey: key, actorId, operation: action, result: json(result) },
    })
    return result
  })
}

function compareSemver(left: string, right: string) {
  const parts = (value: string) => value.split("-")[0].split(".").map(Number)
  const [leftMajor = 0, leftMinor = 0, leftPatch = 0] = parts(left)
  const [rightMajor = 0, rightMinor = 0, rightPatch = 0] = parts(right)
  return leftMajor - rightMajor || leftMinor - rightMinor || leftPatch - rightPatch
}
