import {
  distributionProductInputV1Schema,
  distributionProductPatchV1Schema,
  distributionReleaseInputV1Schema,
} from "@matriz/integration-api-contracts"
import type { DistributionActor } from "./distribution-service"
import { DistributionService } from "./distribution-service"

interface Options {
  readonly authorize?: (request: Request) => DistributionActor | null
  readonly ready?: Promise<unknown>
}

export function createDistributionHttpHandlers(
  service: DistributionService,
  options: Options = {},
) {
  const authorized = (request: Request) => options.authorize?.(request) ?? null
  const key = (request: Request) => request.headers.get("idempotency-key") ?? ""
  const json = (body: unknown, status = 200, headers?: HeadersInit) =>
    Response.json(body, { status, headers })
  const mutate = async (
    request: Request,
    operation: (actor: DistributionActor, body: unknown, key: string) => unknown,
    success = 200,
  ) => {
    await options.ready
    const actor = authorized(request)
    if (!actor) return json({ error: "Unauthorized" }, 401, { "cache-control": "no-store" })
    try {
      return json(await operation(actor, await request.json(), key(request)), success, {
        "cache-control": "no-store",
      })
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : "Distribution operation failed" },
        400,
        { "cache-control": "no-store" },
      )
    }
  }
  return {
    catalog: async (_request: Request) => {
      await options.ready
      return json(await service.catalog(), 200, {
        "cache-control": "public, max-age=60, stale-while-revalidate=300",
        "access-control-allow-origin": "*",
      })
    },
    product: async (_request: Request, productId: string) => {
      await options.ready
      const product = await service.product(productId)
      return product
        ? json(product, 200, {
            "cache-control": "public, max-age=60",
            "access-control-allow-origin": "*",
          })
        : json({ error: "Not found" }, 404, { "access-control-allow-origin": "*" })
    },
    updater: async (
      productId: string,
      target: string,
      currentVersion: string,
    ) => {
      await options.ready
      const product = await service.product(productId)
      const release = product?.state === "active" ? product.release : null
      const artifact =
        target === "windows-x86_64" ? release?.updater?.["windows-x86_64"] : undefined
      const headers = {
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      }
      if (!release || release.status !== "published" || !artifact) {
        return new Response(null, { status: 204, headers })
      }
      if (compareSemver(release.version, currentVersion) <= 0) {
        return new Response(null, { status: 204, headers })
      }
      return json(
        {
          version: release.version,
          notes: release.releaseNotes ?? "",
          pub_date: release.releasedAt,
          url: artifact.url,
          signature: artifact.signature,
          size_bytes: artifact.sizeBytes,
        },
        200,
        headers,
      )
    },
    createProduct: (request: Request) =>
      mutate(
        request,
        (actor, body, idempotencyKey) =>
          service.createProduct(
            actor,
            distributionProductInputV1Schema.parse(body),
            idempotencyKey,
          ),
        201,
      ),
    updateProduct: (request: Request, productId: string) =>
      mutate(request, (actor, body, idempotencyKey) =>
        service.updateProduct(
          actor,
          productId,
          distributionProductPatchV1Schema.parse(body),
          idempotencyKey,
        ),
      ),
    createRelease: (request: Request, productId: string) =>
      mutate(
        request,
        (actor, body, idempotencyKey) =>
          service.createRelease(
            actor,
            productId,
            distributionReleaseInputV1Schema.parse(body),
            idempotencyKey,
          ),
        201,
      ),
    publishRelease: (request: Request, releaseId: string) =>
      mutate(request, (actor, _body, idempotencyKey) =>
        service.publishRelease(actor, releaseId, idempotencyKey),
      ),
    retireRelease: (request: Request, releaseId: string) =>
      mutate(request, (actor, _body, idempotencyKey) =>
        service.retireRelease(actor, releaseId, idempotencyKey),
      ),
  }
}

function compareSemver(left: string, right: string) {
  const parse = (value: string) => {
    const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(value)
    return match ? match.slice(1).map(Number) : null
  }
  const leftParts = parse(left)
  const rightParts = parse(right)
  if (!leftParts || !rightParts) return -1
  for (let index = 0; index < 3; index += 1) {
    const difference = leftParts[index] - rightParts[index]
    if (difference !== 0) return difference
  }
  return 0
}
