import {
  distributionProductInputV1Schema,
  distributionProductPatchV1Schema,
  distributionReleaseInputV1Schema,
} from "@matriz/integration-api-contracts"
import type { DistributionActor } from "./distribution-service"
import { DistributionService } from "./distribution-service"

interface Options { readonly authorize?: (request: Request) => DistributionActor | null; readonly ready?: Promise<unknown> }

export function createDistributionHttpHandlers(service: DistributionService, options: Options = {}) {
  const authorized = (request: Request) => options.authorize?.(request) ?? null
  const key = (request: Request) => request.headers.get("idempotency-key") ?? ""
  const json = (body: unknown, status = 200, headers?: HeadersInit) => Response.json(body, { status, headers })
  const mutate = async (request: Request, operation: (actor: DistributionActor, body: unknown, key: string) => unknown, success = 200) => {
    await options.ready
    const actor = authorized(request)
    if (!actor) return json({ error: "Unauthorized" }, 401, { "cache-control": "no-store" })
    try { return json(await operation(actor, await request.json(), key(request)), success, { "cache-control": "no-store" }) }
    catch (error) { return json({ error: error instanceof Error ? error.message : "Distribution operation failed" }, 400, { "cache-control": "no-store" }) }
  }
  return {
    catalog: async (_request: Request) => { await options.ready; return json(await service.catalog(), 200, { "cache-control": "public, max-age=60, stale-while-revalidate=300", "access-control-allow-origin": "*" }) },
    product: async (_request: Request, productId: string) => {
      await options.ready
      const product = await service.product(productId)
      return product ? json(product, 200, { "cache-control": "public, max-age=60", "access-control-allow-origin": "*" }) : json({ error: "Not found" }, 404, { "access-control-allow-origin": "*" })
    },
    createProduct: (request: Request) => mutate(request, (actor, body, idempotencyKey) => service.createProduct(actor, distributionProductInputV1Schema.parse(body), idempotencyKey), 201),
    updateProduct: (request: Request, productId: string) => mutate(request, (actor, body, idempotencyKey) => service.updateProduct(actor, productId, distributionProductPatchV1Schema.parse(body), idempotencyKey)),
    createRelease: (request: Request, productId: string) => mutate(request, (actor, body, idempotencyKey) => service.createRelease(actor, productId, distributionReleaseInputV1Schema.parse(body), idempotencyKey), 201),
    publishRelease: (request: Request, releaseId: string) => mutate(request, (actor, _body, idempotencyKey) => service.publishRelease(actor, releaseId, idempotencyKey)),
    retireRelease: (request: Request, releaseId: string) => mutate(request, (actor, _body, idempotencyKey) => service.retireRelease(actor, releaseId, idempotencyKey)),
  }
}
