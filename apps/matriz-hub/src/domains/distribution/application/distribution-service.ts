import type {
  DistributionCatalogV1,
  DistributionProductInputV1,
  DistributionProductPatchV1,
  DistributionProductV1,
  DistributionReleaseInputV1,
} from "@matriz/integration-api-contracts"
import {
  distributionProductInputV1Schema,
  distributionReleaseInputV1Schema,
} from "@matriz/integration-api-contracts"

export interface DistributionActor {
  readonly userId: string
  readonly capabilities: readonly string[]
}

export interface DistributionRepository {
  createProduct(
    input: DistributionProductInputV1,
    actorId: string,
    idempotencyKey: string,
  ): Promise<DistributionProductV1>
  updateProduct(
    productId: string,
    input: DistributionProductPatchV1,
    actorId: string,
    idempotencyKey: string,
  ): Promise<DistributionProductV1>
  createRelease(
    productId: string,
    input: DistributionReleaseInputV1,
    actorId: string,
    idempotencyKey: string,
  ): Promise<NonNullable<DistributionProductV1["release"]>>
  publishRelease(
    releaseId: string,
    actorId: string,
    idempotencyKey: string,
    publishedAt: string,
  ): Promise<NonNullable<DistributionProductV1["release"]>>
  retireRelease(
    releaseId: string,
    actorId: string,
    idempotencyKey: string,
  ): Promise<NonNullable<DistributionProductV1["release"]>>
  product(productId: string): Promise<DistributionProductV1 | null>
  catalog(generatedAt: string): Promise<DistributionCatalogV1>
  audit(): Promise<readonly unknown[]>
}

export class DistributionService {
  constructor(
    private readonly repository: DistributionRepository,
    private readonly now = () => new Date(),
  ) {}
  createProduct(
    actor: DistributionActor,
    input: DistributionProductInputV1,
    idempotencyKey: string,
  ) {
    this.authorize(actor)
    return this.repository.createProduct(
      distributionProductInputV1Schema.parse(input),
      actor.userId,
      requiredKey(idempotencyKey),
    )
  }
  updateProduct(
    actor: DistributionActor,
    productId: string,
    input: DistributionProductPatchV1,
    idempotencyKey: string,
  ) {
    this.authorize(actor)
    return this.repository.updateProduct(
      productId,
      input,
      actor.userId,
      requiredKey(idempotencyKey),
    )
  }
  createRelease(
    actor: DistributionActor,
    productId: string,
    input: DistributionReleaseInputV1,
    idempotencyKey: string,
  ) {
    this.authorize(actor)
    return this.repository.createRelease(
      productId,
      distributionReleaseInputV1Schema.parse(input),
      actor.userId,
      requiredKey(idempotencyKey),
    )
  }
  publishRelease(actor: DistributionActor, releaseId: string, idempotencyKey: string) {
    this.authorize(actor)
    return this.repository.publishRelease(
      releaseId,
      actor.userId,
      requiredKey(idempotencyKey),
      this.now().toISOString(),
    )
  }
  retireRelease(actor: DistributionActor, releaseId: string, idempotencyKey: string) {
    this.authorize(actor)
    return this.repository.retireRelease(releaseId, actor.userId, requiredKey(idempotencyKey))
  }
  product(productId: string) {
    return this.repository.product(productId)
  }
  catalog() {
    return this.repository.catalog(this.now().toISOString())
  }
  audit() {
    return this.repository.audit()
  }
  private authorize(actor: DistributionActor) {
    if (!actor.capabilities.includes("distribution.catalog.manage"))
      throw new Error("Missing capability distribution.catalog.manage")
  }
}

function requiredKey(value: string) {
  if (!/^[A-Za-z0-9._:-]{8,160}$/.test(value))
    throw new Error("A valid idempotency key is required")
  return value
}
