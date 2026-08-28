import {
  distributionCatalogV1Schema,
  distributionProductV1Schema,
  distributionReleaseV1Schema,
  type DistributionProductInputV1,
  type DistributionProductPatchV1,
  type DistributionReleaseInputV1,
} from "@matriz/integration-api-contracts"
import { monorepoConfig } from "@matriz/platform-config"

interface Options {
  readonly baseUrl: string
  readonly token?: string
  readonly fetch?: typeof fetch
}

export class DistributionAdminGateway {
  private readonly fetcher: typeof fetch
  constructor(private readonly options: Options) {
    this.fetcher = options.fetch ?? fetch
  }

  async catalog() {
    const response = await this.fetcher(`${this.options.baseUrl}/api/v1/distribution/catalog`, {
      cache: "no-store",
    })
    return distributionCatalogV1Schema.parse(await body(response))
  }
  createProduct(input: DistributionProductInputV1, key: string) {
    return this.command(
      "/api/v1/distribution/admin/products",
      "POST",
      input,
      key,
      distributionProductV1Schema,
    )
  }
  updateProduct(productId: string, input: DistributionProductPatchV1, key: string) {
    return this.command(
      `/api/v1/distribution/admin/products/${encodeURIComponent(productId)}`,
      "PATCH",
      input,
      key,
      distributionProductV1Schema,
    )
  }
  createRelease(productId: string, input: DistributionReleaseInputV1, key: string) {
    return this.command(
      `/api/v1/distribution/admin/products/${encodeURIComponent(productId)}/releases`,
      "POST",
      input,
      key,
      distributionReleaseV1Schema,
    )
  }
  publishRelease(releaseId: string, key: string) {
    return this.command(
      `/api/v1/distribution/admin/releases/${encodeURIComponent(releaseId)}/publish`,
      "POST",
      {},
      key,
      distributionReleaseV1Schema,
    )
  }
  retireRelease(releaseId: string, key: string) {
    return this.command(
      `/api/v1/distribution/admin/releases/${encodeURIComponent(releaseId)}/retire`,
      "POST",
      {},
      key,
      distributionReleaseV1Schema,
    )
  }

  private async command<T>(
    path: string,
    method: string,
    input: unknown,
    key: string,
    schema: { parse(value: unknown): T },
  ): Promise<T> {
    if (!this.options.token || this.options.token.length < 16)
      throw new Error("MATRIZ_DISTRIBUTION_ADMIN_TOKEN is not configured")
    const response = await this.fetcher(`${this.options.baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.options.token}`,
        "content-type": "application/json",
        "idempotency-key": key,
      },
      body: JSON.stringify(input),
    })
    return schema.parse(await body(response))
  }
}

async function body(response: Response) {
  const value = await response.json()
  if (!response.ok)
    throw new Error(
      (value as { error?: string }).error ?? `Hub distribution request failed (${response.status})`,
    )
  return value
}

export function createDistributionGatewayFromEnvironment() {
  return new DistributionAdminGateway({
    baseUrl: process.env.MATRIZ_HUB_URL ?? monorepoConfig.baseUrls["matriz-hub"],
    token: process.env.MATRIZ_DISTRIBUTION_ADMIN_TOKEN,
  })
}
